---
title: Running Qwen3.8-Flash-Next on Two V100s
date: 2026-10-23
tags:
  - AI
  - Local Deployment
  - GPU
description: Compiling Strata for two 16GB V100s to run Qwen3.8-Flash-Next IQ3_XXS with 64GB of host RAM, and measuring how long 256K requests actually take.
outline: deep
aside: true
---

# Running Qwen3.8-Flash-Next on Two V100s

<!-- DESC SEP -->

Compiling Strata for two 16GB V100s to run Qwen3.8-Flash-Next IQ3_XXS with 64GB of host RAM, and measuring how long 256K requests actually take.

<!-- DESC SEP -->

The two IQ3_XXS weight shards add up to 75.84GB, while two 16GB V100 cards offer only 32GB of VRAM between them.

Getting the model running on this older server means letting Strata split the load: active layers and a window of KV cache stay in VRAM, a large share of expert weights lives in the 64GB of host RAM, and the lookup tables stay on the SSD to be mapped on demand.

The cards themselves add a second hurdle. Because V100s belong to the Volta generation (`sm_70`), prebuilt Strata binaries skip them, so the engine has to be compiled from source against CUDA 12. Below is the complete setup and what the latency looks like in practice.

## Hardware and the memory budget

| Item             | Machine configuration                                                |
| ---------------- | -------------------------------------------------------------------- |
| Operating system | Ubuntu 26.04.1 LTS, x86_64                                           |
| Kernel           | `7.0.0-38-generic`                                                   |
| CPU              | One Xeon E5-2686 v4, 18 cores and 36 threads, with AVX2              |
| RAM and swap     | Nominal 64GB, about 61GiB visible to the OS, 8GiB swap               |
| GPUs             | Two Tesla V100-SXM2-16GB cards                                       |
| GPU interconnect | `nvidia-smi topo -m` reports `NV6`                                   |
| Disk             | Colorful SL500 512GB SATA SSD, about 476.9GiB visible to the OS      |
| NVIDIA driver    | `580.178.04`                                                         |
| Container tools  | Docker `29.8.1`, Compose `v5.5.1`, NVIDIA Container Toolkit `1.20.1` |
| Strata           | Application `0.2.1`, engine `0.1.46`                                 |

The two GGUF shards play different roles. The first shard (47.04GB) holds the transformer weights; the second (28.80GB) stores the per-layer n-gram embedding lookup table, which can stay on the SSD and be accessed via memory mapping without occupying VRAM. Their exact breakdown is listed in the [model repository](https://huggingface.co/ISTA-DASLab/Qwen3.8-Flash-Next-GSQ-RCO-GGUF/blob/ed59f92082b1e93c0e96d60a8b11aab089b52f09/README.md#available-files).

On this machine, GPU 0 runs layers 0–24, GPU 1 runs layers 25–47, and roughly 30.73GiB of expert data stays resident in host RAM.

To leave room for a 256K context window, the KV cache is quantized to INT8, keeping 32,768 cells per QSA layer in VRAM and spilling the rest to system memory. That pushes the 64GB of host RAM close to its ceiling—during the full-context stress test below, available system memory dipped to 4.29GiB.

## Why Volta stays on CUDA 12

According to the [NVIDIA support matrix](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html), Volta sits at compute capability 7.0, with CUDA 12.x as its final supported toolkit series and R580 as its last driver branch.

Even though `nvidia-smi` on driver 580.178.04 prints `CUDA Version: 13.0` in the header, that only reflects the driver's ceiling—compiling `sm_70` kernels still requires a CUDA 12 toolchain. Here we compile inside a container running CUDA 12.8.93.

The host only needs the NVIDIA driver, Docker, and the NVIDIA Container Toolkit. If your machine already runs GPU containers, jump to the one-line check at the end of this section; fresh host setup steps are tucked into the block below.

<details>
<summary>Ubuntu 26.04 base environment installation</summary>

Install media can be pulled from [Ubuntu Releases](https://releases.ubuntu.com/26.04/) or the [Tsinghua mirror](https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/26.04/). Following [Tsinghua's repository notes](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/), security updates point directly to the official archive.

```bash
UBUNTU_ARCHIVE=https://mirrors.tuna.tsinghua.edu.cn/ubuntu
# UBUNTU_ARCHIVE=http://archive.ubuntu.com/ubuntu

cat > /etc/apt/sources.list.d/ubuntu.sources <<EOF
Types: deb
URIs: ${UBUNTU_ARCHIVE}
Suites: resolute resolute-updates resolute-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu
Suites: resolute-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF

apt-get update
apt-get install -y ca-certificates curl gnupg jq openssl python3 \
  build-essential linux-headers-$(uname -r)
apt-cache policy nvidia-driver-580
apt-get install -y nvidia-driver-580
```

Confirm the driver is on the 580 branch and reboot:

```bash
reboot
```

After reconnecting, install Docker from the [Tsinghua Docker CE mirror](https://mirrors4.tuna.tsinghua.edu.cn/help/docker-ce/) or the [official Docker repository](https://docs.docker.com/engine/install/ubuntu/):

```bash
DOCKER_REPO=https://mirrors.tuna.tsinghua.edu.cn/docker-ce/linux/ubuntu
# DOCKER_REPO=https://download.docker.com/linux/ubuntu

install -m 0755 -d /etc/apt/keyrings
curl -fsSL "${DOCKER_REPO}/gpg" -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: ${DOCKER_REPO}
Suites: resolute
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
docker --version
docker compose version
```

Install the NVIDIA Container Toolkit from the [USTC mirror](https://mirrors.ustc.edu.cn/help/libnvidia-container.html) or the [official NVIDIA repository](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html):

```bash
NVIDIA_REPO=https://mirrors.ustc.edu.cn/libnvidia-container
# NVIDIA_REPO=https://nvidia.github.io/libnvidia-container

curl -fsSL "${NVIDIA_REPO}/gpgkey" \
  -o /tmp/nvidia-container-toolkit.asc
gpg --dearmor --yes \
  -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg \
  /tmp/nvidia-container-toolkit.asc

curl -fsSL \
  "${NVIDIA_REPO}/stable/deb/nvidia-container-toolkit.list" \
  -o /tmp/nvidia-container-toolkit.list

sed \
  "s#https://nvidia.github.io/libnvidia-container#${NVIDIA_REPO}#g; s#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g" \
  /tmp/nvidia-container-toolkit.list \
  > /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt-get update
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
```

Restart Docker to apply the runtime hook:

```bash
systemctl restart docker
nvidia-ctk --version
```

</details>

Verify that a minimal CUDA container can see both V100 cards:

```bash
CUDA_IMAGE=docker.1ms.run/nvidia/cuda:12.8.1-runtime-ubuntu24.04
# CUDA_IMAGE=nvidia/cuda:12.8.1-runtime-ubuntu24.04
docker run --rm --gpus all "${CUDA_IMAGE}" nvidia-smi
```

## Downloading both shards and the vision projector

We use `uv` on the host to run the Hugging Face CLI. If `uv` is not installed yet, grab the prebuilt binary from GitHub Releases (or through [GH-Proxy](https://gh-proxy.com/)); see the [official uv docs](https://docs.astral.sh/uv/getting-started/installation/#github-releases) for details:

```bash
GITHUB_PREFIX=https://gh-proxy.com/
# GITHUB_PREFIX=''

curl -fL \
  "${GITHUB_PREFIX}https://github.com/astral-sh/uv/releases/download/0.12.17/uv-x86_64-unknown-linux-gnu.tar.gz" \
  -o /tmp/uv-x86_64-unknown-linux-gnu.tar.gz
tar -xzf /tmp/uv-x86_64-unknown-linux-gnu.tar.gz -C /tmp
install -m 0755 /tmp/uv-x86_64-unknown-linux-gnu/uv /usr/local/bin/uv
install -m 0755 /tmp/uv-x86_64-unknown-linux-gnu/uvx /usr/local/bin/uvx
uv --version
```

The two GGUF shards and the vision projector take about 76.75GB, and the first launch will pull another ~1.5GiB for the pack and ~6.5GiB for MTP. Make sure you have plenty of disk headroom, then download the pinned revision via [HF-Mirror](https://hf-mirror.com/) (or Hugging Face directly):

```bash
mkdir -p /srv/llm/models/qwen/Qwen3.8-Flash-Next-GSQ-RCO \
  /srv/llm/strata-build /srv/llm/strata-data

export UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple
export HF_ENDPOINT=https://hf-mirror.com
# export UV_DEFAULT_INDEX=https://pypi.org/simple
# export HF_ENDPOINT=https://huggingface.co

UV_PYTHON_DOWNLOADS=never uvx --python /usr/bin/python3 \
  --from huggingface_hub hf download \
  ISTA-DASLab/Qwen3.8-Flash-Next-GSQ-RCO-GGUF \
  IQ3_XXS/Qwen3.8-Flash-Next-GSQ-RCO-IQ3_XXS-00001-of-00002.gguf \
  IQ3_XXS/Qwen3.8-Flash-Next-GSQ-RCO-IQ3_XXS-00002-of-00002.gguf \
  mmproj-Qwen3.8-Flash-Next-BF16.gguf \
  --revision ed59f92082b1e93c0e96d60a8b11aab089b52f09 \
  --local-dir /srv/llm/models/qwen/Qwen3.8-Flash-Next-GSQ-RCO
```

Keep the original shard filenames intact and point Strata at the first shard. Copy `mmproj` into Strata's data directory so the installer reuses the local file on startup:

```bash
install -D -m 0644 \
  /srv/llm/models/qwen/Qwen3.8-Flash-Next-GSQ-RCO/mmproj-Qwen3.8-Flash-Next-BF16.gguf \
  /srv/llm/strata-data/Strata-data/models/mmproj-Qwen3.8-Flash-Next-BF16.gguf
```

## Compiling the sm_70 engine

The [Strata V100 guide](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/NVIDIA_V100.md) outlines what the community build needs: CUDA 12, architecture `70`, and `STRATA_EXPERIMENTAL_SM60=ON` (which, despite the flag's name, unlocks Volta as well).

Fetch the pinned archives for Strata and llama.cpp:

```bash
cd /srv/llm/strata-build

curl -fL \
  "${GITHUB_PREFIX}https://github.com/Niko1221/Strata/archive/a7bdbfdabc9a3e7c83e3dbc2441d0933569d773e.tar.gz" \
  -o strata-a7bdbfdabc9a.tar.gz
mkdir -p Strata-a7bdbfdabc9a
tar -xzf strata-a7bdbfdabc9a.tar.gz \
  --strip-components=1 -C Strata-a7bdbfdabc9a

curl -fL \
  "${GITHUB_PREFIX}https://github.com/ggml-org/llama.cpp/archive/3cf03257f219afbe7334045ff7c6a06ac68c627d.tar.gz" \
  -o llama-3cf03257.tar.gz
mkdir -p Strata-a7bdbfdabc9a/third_party/llama.cpp
tar -xzf llama-3cf03257.tar.gz \
  --strip-components=1 -C Strata-a7bdbfdabc9a/third_party/llama.cpp
```

Save the following as `/srv/llm/strata-build/Dockerfile.v100`. The build stage borrows CUDA 12.8.93 and GCC 11.4.0 from the 1Cat-vLLM image, while the runtime stage layers the compiled `sm_70` engine and `strata-vision` binary onto Strata `0.2.1-cuda12`:

```dockerfile
ARG BUILD_IMAGE=shig249/1cat-vllm-1.5.0@sha256:013c033c7e088fe6d4eb95887d0a617eca4a38c73fa66423ec81fe3c4b90e576
ARG RUNTIME_IMAGE=ghcr.io/niko1221/strata@sha256:e9b978fbf119ceddae7c1fd980a69e11bec96b149e33be77524b3601838c62d2

FROM ${BUILD_IMAGE} AS build
WORKDIR /src
COPY Strata-a7bdbfdabc9a/ /src/
RUN cmake -G Ninja -S . -B /build \
      -DCMAKE_BUILD_TYPE=Release \
      -DSTRATA_ENABLE_CUDA=ON \
      -DSTRATA_EXPERIMENTAL_SM60=ON \
      -DSTRATA_BUILD_TESTS=OFF \
      -DSTRATA_PORTABLE=ON \
      -DCMAKE_CUDA_ARCHITECTURES=70 \
      -DSTRATA_GGML_DIR=/src/third_party/llama.cpp \
    && cmake --build /build --target strata strata_kq -j 6
RUN mkdir -p /stage \
    && cp /build/strata /build/libstrata_kq.so /src/LICENSE /stage/ \
    && uv run --no-project python packaging/collect_libs.py \
      --binary /build/strata --search /usr/local/cuda/lib64 \
      --out /stage --also 'libcublasLt.so*' \
    && uv run --no-project python packaging/package_engine.py \
      --src /stage --backend cuda --version 0.1.46 \
      --out /components/engine --arch sm_70 \
      --platform linux-x86_64 --variant cuda12-sm70 \
      --min-driver nvidia=575.51 \
      --build-id a7bdbfdabc9a-cuda12.8-sm70

FROM ${RUNTIME_IMAGE}
COPY --from=build /components/ /opt/strata-v100/components/
RUN cp /opt/strata/components/engine/0.1.46-linux-x86_64-cuda-cuda12/strata-vision \
       /opt/strata-v100/components/engine/0.1.46-linux-x86_64-cuda-cuda12-sm70/strata-vision
ENV STRATA_COMPONENTS_DIR=/opt/strata-v100/components
LABEL com.strata.engine="0.1.46-linux-x86_64-cuda-cuda12-sm70" \
      com.strata.build="a7bdbfdabc9a-cuda12.8-sm70"
```

Build the image (omit the two `--build-arg` lines if pulling directly from Docker Hub and GHCR):

```bash
docker build --progress=plain \
  --build-arg BUILD_IMAGE=docker.1ms.run/shig249/1cat-vllm-1.5.0@sha256:013c033c7e088fe6d4eb95887d0a617eca4a38c73fa66423ec81fe3c4b90e576 \
  --build-arg RUNTIME_IMAGE=ghcr.1ms.run/niko1221/strata@sha256:e9b978fbf119ceddae7c1fd980a69e11bec96b149e33be77524b3601838c62d2 \
  -f /srv/llm/strata-build/Dockerfile.v100 \
  -t local/strata:0.2.1-cuda12-sm70 /srv/llm/strata-build
```

Once `CUDA enabled, arch 70` scrolls by in the build output, the engine is ready.

## Starting the service and tuning vision

Generate an API key for the server:

```bash
cd /srv/llm
install -d -m 0700 /srv/llm/strata-data/state
if [ ! -f /srv/llm/strata-data/state/api-key ]; then
  (umask 077; openssl rand -hex 32 > /srv/llm/strata-data/state/api-key)
fi
```

Save the Compose definition to `/srv/llm/docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml` (swap `127.0.0.1` for a LAN IP if you want to reach it from another machine):

```yaml
services:
  strata-qwen38-flash-next-iq3-xxs:
    image: local/strata:0.2.1-cuda12-sm70
    pull_policy: never
    container_name: strata-qwen38-flash-next-iq3-xxs
    restart: unless-stopped
    gpus: all
    ports:
      - '127.0.0.1:8080:8080'
    shm_size: 2gb
    stop_grace_period: 2m
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - type: bind
        source: /srv/llm/models/qwen/Qwen3.8-Flash-Next-GSQ-RCO
        target: /models
        read_only: true
        bind:
          create_host_path: false
      - type: bind
        source: /srv/llm/strata-data
        target: /data
        bind:
          create_host_path: false
    configs:
      - source: thinking-on
        target: /data/state/strata/launch/docker-iq3-xxs.shared-settings.json
    environment:
      FAMILY: qwen
      STRATA_SOURCE: modelscope
      MODEL: IQ3_XXS
      MODEL_PATH: /models/IQ3_XXS/Qwen3.8-Flash-Next-GSQ-RCO-IQ3_XXS-00001-of-00002.gguf
      GPUS: '0,1'
      CONTEXT: 256k
      PARALLEL: '2'
      VISION: cpu
      KV: int8
      TUNE: skip
      STRATA_SET: >-
        vram-reserve-mib=1536 vram-reserve-later-mib=1536
        resident-budget-gib=32 kv-resident=32768
        STRATA_ROUTE_TAIL_SKIP=0
        STRATA_BATCH_MTP=1 STRATA_BATCH_MTP_SERIAL=1
      PRESET: docker-iq3-xxs
      API_KEY_FILE: /data/state/api-key

configs:
  thinking-on:
    content: |
      {"reasoning_effort":"high"}
```

On first launch, Strata fetches its pack and MTP files from the configured source:

| Download source       | Compose environment variables                                           |
| --------------------- | ----------------------------------------------------------------------- |
| Official Hugging Face | `STRATA_SOURCE: huggingface`                                            |
| HF-Mirror             | `STRATA_SOURCE: huggingface`, plus `HF_ENDPOINT: https://hf-mirror.com` |
| ModelScope            | `STRATA_SOURCE: modelscope` (shown above)                               |

The `STRATA_SET` string encodes the memory layout we walked through earlier: `resident-budget-gib=32` caps the host RAM expert cache, `kv-resident=32768` bounds the VRAM KV window, and `1536MiB` stays reserved per card. Vision encoding runs on the CPU, and batch MTP is enabled. Full parameter descriptions live in the [Strata Docker documentation](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/DOCKER.md).

Make sure both GPUs are clear and bring the container up:

```bash
cd /srv/llm
nvidia-smi
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  config --quiet
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  up -d
docker logs -f --tail 100 strata-qwen38-flash-next-iq3-xxs
```

Populating over 30GiB of expert cache in host RAM takes a moment—about 149 seconds on this server. Once the logs settle, exit with `Ctrl+C` and query the health endpoint:

```bash
curl --noproxy '*' --max-time 10 -fsS http://127.0.0.1:8080/health | jq .
```

Look for `loaded=true`, `images=true`, and `max_context=262144`.

By default, CPU image encoding budgets only 300 visual tokens. To raise that ceiling to 1024 tokens across 16 CPU threads, stop the container after its initial config file is generated, patch the JSON, and start it back up:

```bash
cd /srv/llm
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml stop

VISION_CONFIG=/srv/llm/strata-data/install/strata-iq3_xxs.json
jq '.vision.max_tokens = 1024 | .vision.threads = 16' \
  "${VISION_CONFIG}" > "${VISION_CONFIG}.tmp" && \
  mv "${VISION_CONFIG}.tmp" "${VISION_CONFIG}"

docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml up -d
```

## First request and routine checks

With the health check passing, read the API key and send a short prompt:

```bash
STRATA_API_KEY=$(cat /srv/llm/strata-data/state/api-key)
STRATA_URL=http://127.0.0.1:8080

curl --noproxy '*' --fail-with-body -sS \
  "${STRATA_URL}/v1/chat/completions" \
  -H "Authorization: Bearer ${STRATA_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "qwen3.8-flash-next-iq3_xxs",
    "messages": [{"role": "user", "content": "Explain database transaction atomicity in two sentences."}],
    "max_tokens": 4096,
    "stream": false
  }' | jq .
```

Reasoning effort defaults to `high`; pass `"reasoning_effort": "none"` in the payload if you want a direct reply without thinking tokens.

When checking on memory pressure or container health, these four commands tell the story:

```bash
docker logs --tail 100 strata-qwen38-flash-next-iq3-xxs
free -h
nvidia-smi
docker stats --no-stream strata-qwen38-flash-next-iq3-xxs
```

## How long do 256K inputs actually take?

Short prompts feel snappy, but pushing the context window near its 256K ceiling makes the wait unmistakable.

| Scenario                         | Input tokens | Result                                                                         |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| One short request                | 76           | Engine-reported generation speed of about 62 tokens/s                          |
| Two short requests               | 76 each      | About 37.7 and 39.8 tokens/s per request                                       |
| Long request 1, with five images | 257861       | All three text codes and five image numbers correct; about 931.5 seconds total |
| Long request 2, with five images | 257868       | All three text codes and five image numbers correct; about 738.7 seconds total |

In the long-context test, three verification codes were buried near the start, middle, and end of a ~258K-token prompt alongside five number cards. Neither concurrent request hit a warm cache. Both recovered every code and image digit accurately, yet between CPU image encoding, massive prompt prefill, and reasoning generation, each request took 12 to 16 minutes from start to finish.

Even follow-up turns depend heavily on whether the prefix stays cached: one follow-up reused 257,856 cached tokens and finished in 100.9 seconds, while the other missed (`cached_tokens=0`) and took 365.5 seconds.

During that run, free host RAM dropped to 4.29GiB, free VRAM hovered around 1GiB per V100, and swap began to see light use. Offloading to system memory lets two aging 16GB cards hold a 256K multimodal model upright without crashing, but the wall-clock cost of prefilling a quarter-million tokens on Volta hardware remains very real.
