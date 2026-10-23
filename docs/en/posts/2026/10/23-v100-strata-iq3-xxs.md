---
title: Running Qwen3.8-Flash-Next on Two V100s
date: 2026-10-23
tags:
  - AI
  - Local Deployment
  - GPU
description: Compile Strata for two V100s and run Qwen3.8-Flash-Next IQ3_XXS with 64GB of host RAM, including deployment steps and long-context latency measurements.
outline: deep
aside: true
---

# Running Qwen3.8-Flash-Next on Two V100s

<!-- DESC SEP -->

Two 16GB V100s and 64GB of RAM can run Qwen3.8-Flash-Next IQ3_XXS. This requires compiling Strata for Volta and keeping some experts and KV cache in host memory. Short requests generated about 62 tokens/s, while two concurrent requests near the 256K limit, each with five images, took 12–16 minutes to complete.

<!-- DESC SEP -->

The two IQ3_XXS GGUF shards total about 75.84GB, far beyond the GPUs' combined 32GB of VRAM. Strata distributes expert caches across GPU and host memory, with data read from SSD as needed, allowing the model to run on this hardware.

The V100 architecture presents another hurdle. The prebuilt Strata engine does not cover `sm_70`, so it needs a separate CUDA 12 build. These two constraints shape the deployment below. Commands run as root in Bash on an Ubuntu server. The configuration comes from the running machine; installation commands were assembled from documentation and have not been replayed on a clean system.

## Hardware and memory allocation

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

The shards serve different purposes. The first, about 47.04GB, holds transformer weights. The second, about 28.80GB, holds the per-layer n-gram embedding lookup table and can remain on SSD, accessed through memory mapping. Both shards are required, but the second does not have to fit entirely in VRAM. The [model repository](https://huggingface.co/ISTA-DASLab/Qwen3.8-Flash-Next-GSQ-RCO-GGUF/blob/ed59f92082b1e93c0e96d60a8b11aab089b52f09/README.md#available-files) describes their contents and sizes.

On this machine, Strata splits layers between the GPUs. GPU 0 runs layers 0–24, GPU 1 runs layers 25–47, and about 30.73GiB of expert data resides in host memory. Long contexts also need KV cache, so this setup uses INT8 KV with 32768 cells per QSA layer resident in VRAM and the rest in host memory. The 64GB of RAM carries a substantial load; available memory fell to about 4.29GiB during the long-context test below.

## The V100 needs CUDA 12

The [NVIDIA support matrix](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html) lists Volta as compute capability 7.0, with CUDA 12.x as its last supported toolkit series and R580 as its last driver branch. This machine runs driver 580.178.04 and compiles with CUDA 12.8.93 inside a container. The `CUDA Version: 13.0` shown by `nvidia-smi` is the driver's supported maximum; it does not make CUDA 13 suitable for compiling a V100 engine.

The host needs the driver, Docker, and NVIDIA Container Toolkit. The build image supplies the CUDA toolchain. If GPU containers already work, skip to the check at the end of this section. Installation steps for a fresh environment are folded below. Downloads default to mirrors accessible from mainland China, with official sources retained in code comments.

<details>
<summary>Ubuntu 26.04 base environment installation</summary>

Installation media is available from [Ubuntu](https://releases.ubuntu.com/26.04/) or the [Tsinghua mirror](https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/26.04/). The repository configuration below targets a fresh Ubuntu 26.04 x86_64 installation; adapt it if custom sources already exist. Following [Tsinghua's guidance](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/), security updates retain the official source.

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

Check that the driver package still belongs to the 580 branch. Reboot after installation; this disconnects SSH.

```bash
reboot
```

After reconnecting, install Docker from the [Tsinghua Docker CE mirror](https://mirrors4.tuna.tsinghua.edu.cn/help/docker-ce/) or the [official repository](https://docs.docker.com/engine/install/ubuntu/). If Docker is already installed, check the official documentation for conflicting packages first.

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

NVIDIA Container Toolkit is available from the [USTC mirror](https://mirrors.ustc.edu.cn/help/libnvidia-container.html) or the [official source](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).

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

Restarting Docker affects existing containers, so arrange downtime first.

```bash
systemctl restart docker
nvidia-ctk --version
```

</details>

Check that a CUDA container can see both GPUs. `docker.1ms.run` is the download endpoint used on this machine; the official source is Docker Hub.

```bash
CUDA_IMAGE=docker.1ms.run/nvidia/cuda:12.8.1-runtime-ubuntu24.04
# CUDA_IMAGE=nvidia/cuda:12.8.1-runtime-ubuntu24.04
docker run --rm --gpus all "${CUDA_IMAGE}" nvidia-smi
```

Continue with downloads and compilation once both V100s are visible inside the container.

## Download both weight shards

The host uses uv to run the Hugging Face CLI. Choose a GitHub download endpoint first; both uv installation and source downloads use `GITHUB_PREFIX`. The example uses [GH-Proxy](https://gh-proxy.com/). Leave the prefix empty for direct access. If uv is already installed, skip the installation commands after setting the prefix. Binary releases are described in the [official documentation](https://docs.astral.sh/uv/getting-started/installation/#github-releases).

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

The model and vision files total about 76.75GB. Allow additional space for the pack, about 1.5GiB, MTP, about 6.5GiB, and build images and caches. Create the directories and download both GGUF shards and `mmproj`. Python packages use Tsinghua PyPI, while model files use [HF-Mirror](https://hf-mirror.com/). Official endpoints remain in the comments.

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

The revision matches the pin in the Strata source version used below. Keep both shards' original filenames and point the startup configuration at the first one. Copy the vision file into Strata's data directory so the installer can reuse it.

```bash
install -D -m 0644 \
  /srv/llm/models/qwen/Qwen3.8-Flash-Next-GSQ-RCO/mmproj-Qwen3.8-Flash-Next-BF16.gguf \
  /srv/llm/strata-data/Strata-data/models/mmproj-Qwen3.8-Flash-Next-BF16.gguf
```

## Compile the sm_70 engine

The [Strata V100 documentation](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/NVIDIA_V100.md) describes the experimental community build. The essential settings are CUDA 12, architecture `70`, and `STRATA_EXPERIMENTAL_SM60=ON`. Despite its name, that switch also admits Volta.

Download pinned Strata and llama.cpp sources so the build does not follow changes on their main branches. `GITHUB_PREFIX` still selects direct access or the download proxy.

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

Save the following as `/srv/llm/strata-build/Dockerfile.v100`. The build stage reuses CUDA 12.8.93 and GCC 11.4.0 from the 1Cat-vLLM image; the runtime stage uses Strata `0.2.1-cuda12`. Both digests come from the machine's build log.

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

`strata-vision` handles image encoding and must also be copied into the new component directory.

This machine pulls images through `docker.1ms.run` and `ghcr.1ms.run`. To use Docker Hub and GHCR directly, omit the two `--build-arg` lines below and use the Dockerfile defaults.

```bash
docker build --progress=plain \
  --build-arg BUILD_IMAGE=docker.1ms.run/shig249/1cat-vllm-1.5.0@sha256:013c033c7e088fe6d4eb95887d0a617eca4a38c73fa66423ec81fe3c4b90e576 \
  --build-arg RUNTIME_IMAGE=ghcr.1ms.run/niko1221/strata@sha256:e9b978fbf119ceddae7c1fd980a69e11bec96b149e33be77524b3601838c62d2 \
  -f /srv/llm/strata-build/Dockerfile.v100 \
  -t local/strata:0.2.1-cuda12-sm70 /srv/llm/strata-build
```

Look for `CUDA enabled, arch 70` in the build log. If a proxy returns `manifest unknown`, check its image availability or switch to the official source while retaining the same digest.

## Configure and start the model

The model directory mounts at `/models`, and persistent data at `/data`. Create an API key, reusing any existing key.

```bash
cd /srv/llm
install -d -m 0700 /srv/llm/strata-data/state
if [ ! -f /srv/llm/strata-data/state/api-key ]; then
  (umask 077; openssl rand -hex 32 > /srv/llm/strata-data/state/api-key)
fi
```

Save the following as `/srv/llm/docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml`. For LAN access, replace `127.0.0.1` in the port binding with the server's LAN IP and adjust subsequent request URLs accordingly.

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

The first start also prepares the pack and MTP. Choose their download source in Compose.

| Download source       | Compose environment variables                                           |
| --------------------- | ----------------------------------------------------------------------- |
| Official Hugging Face | `STRATA_SOURCE: huggingface`                                            |
| HF-Mirror             | `STRATA_SOURCE: huggingface`, plus `HF_ENDPOINT: https://hf-mirror.com` |
| ModelScope            | `STRATA_SOURCE: modelscope`, as above                                   |

Host environment variables do not automatically enter the container. The Hugging Face path uses pinned revisions, while ModelScope serves current files, so account for version differences when switching.

For memory allocation, `resident-budget-gib=32` controls the host expert cache, `kv-resident=32768` limits the KV window resident in VRAM, and each GPU reserves another 1536MiB. Image encoding runs on the CPU, batch MTP is enabled, and both automatic tuning and expert skipping are disabled. These settings come from the running machine. The [Strata Docker documentation](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/DOCKER.md) covers the full configuration.

`256k` sets a per-session limit of 262144 tokens shared by input, images, reasoning, and output. Reduce context and concurrency if RAM is lower or other processes use the GPUs. Free both cards before starting.

```bash
cd /srv/llm
nvidia-smi
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  config --quiet
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  up -d
docker logs -f --tail 100 strata-qwen38-flash-next-iq3-xxs
```

Loading the host expert cache takes time too; that stage alone took about 149 seconds on this machine. Press `Ctrl+C` to stop following logs, then check readiness through the health endpoint.

```bash
curl --noproxy '*' --max-time 10 -fsS http://127.0.0.1:8080/health | jq .
```

Confirm `loaded=true`, `images=true`, and `max_context=262144`.

CPU image encoding defaults to a budget of 300 visual tokens. This machine uses 1024 and 16 threads. To reproduce those settings, stop the service after its configuration has first been generated, change the budget, and start it again.

```bash
cd /srv/llm
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml stop

VISION_CONFIG=/srv/llm/strata-data/install/strata-iq3_xxs.json
jq '.vision.max_tokens = 1024 | .vision.threads = 16' \
  "${VISION_CONFIG}" > "${VISION_CONFIG}.tmp" && \
  mv "${VISION_CONFIG}.tmp" "${VISION_CONFIG}"

docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml up -d
```

Wait for the health check again. Recheck the image budget if the generated configuration is deleted or the model is reinstalled.

## Send the first request

Once the health check passes, read the API key and send a short request from the server.

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

Reasoning defaults to `high`; add `"reasoning_effort": "none"` to the request to turn it off. The output budget includes reasoning, so check whether the answer is complete when `finish_reason=length` appears.

Strata includes a web UI for chat and image uploads. After binding to a LAN IP, open `http://SERVER_LAN_IP:8080/` in a browser to test images. The machine passed a tool-call round trip and two five-image digit-recognition tests. Five is the tested count; the configuration does not impose a five-image hard limit.

After editing Compose, use `up -d` to apply changes; a plain `restart` does not recreate the configuration. Keep the model directory, local image, and `/srv/llm/strata-data`, which holds the pack, MTP, vision component, and key. For runtime problems, start with logs, RAM, and VRAM.

```bash
docker logs --tail 100 strata-qwen38-flash-next-iq3-xxs
free -h
nvidia-smi
docker stats --no-stream strata-qwen38-flash-next-iq3-xxs
```

## How long do long inputs take?

| Scenario                         | Input tokens | Result                                                                         |
| -------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| One short request                | 76           | Engine-reported generation speed of about 62 tokens/s                          |
| Two short requests               | 76 each      | About 37.7 and 39.8 tokens/s per request                                       |
| Long request 1, with five images | 257861       | All three text codes and five image numbers correct; about 931.5 seconds total |
| Long request 2, with five images | 257868       | All three text codes and five image numbers correct; about 738.7 seconds total |

The long-context test placed verification codes near the beginning, middle, and end of the text and attached five number cards to each request. Neither independent new request hit the cache. Both returned the target answers correctly but ended with `length` as subsequent output exhausted the budget. The short tests also used fixed output budgets; their engine-reported generation rates include reasoning and answer tokens. Throughput and total request duration measure different stages and cannot be converted directly into each other.

Follow-up requests were not consistently fast either. One reused 257856 cached tokens and took about 100.9 seconds; the other reported `cached_tokens=0` and took about 365.5 seconds. Check `usage.prompt_tokens_details.cached_tokens` to see whether a long history was reused.

During the long test, available RAM fell to about 4.29GiB, free VRAM was about 1GiB per card, and swap was in use. The records show no OOM or automatic container restart, but resource headroom remained tight. These results cover verification codes and number-card images; they do not establish long-term multi-user stability or performance on real codebase tasks.
