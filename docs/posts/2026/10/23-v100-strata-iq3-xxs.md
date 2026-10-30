---
title: 双卡 V100 运行 Qwen3.8-Flash-Next
date: 2026-10-23
tags:
  - AI
  - 本地部署
  - GPU
description: 为两张 16GB V100 编译 Strata 引擎，借助 64GB 主机内存跑起 Qwen3.8-Flash-Next IQ3_XXS，并记录 256K 长上下文的真实耗时。
outline: deep
aside: true
---

# 双卡 V100 运行 Qwen3.8-Flash-Next

<!-- DESC SEP -->

为两张 16GB V100 编译 Strata 引擎，借助 64GB 主机内存跑起 Qwen3.8-Flash-Next IQ3_XXS，并记录 256K 长上下文的真实耗时。

<!-- DESC SEP -->

两片 IQ3_XXS 权重合计 75.84GB，而手头两张 V100 的显存加起来只有 32GB。

想在这台旧服务器上把模型跑起来，得靠 Strata 把专家缓存拆开：一部分留在显存，大头放进 64GB 主机内存，剩下的留在 SSD 里按需读取。

另一道门槛在卡本身。V100 属于 Volta 架构（`sm_70`），预编译的 Strata 引擎没有带上它，必须退回 CUDA 12 手工编译一份。下面记下这套配置在 Ubuntu 服务器上的折腾过程与实测表现。

## 硬件与内存账本

| 项目        | 实机配置                                                             |
| ----------- | -------------------------------------------------------------------- |
| 操作系统    | Ubuntu 26.04.1 LTS，x86_64                                           |
| 内核        | `7.0.0-38-generic`                                                   |
| CPU         | Xeon E5-2686 v4，单路 18 核 36 线程，支持 AVX2                       |
| 内存与 Swap | 标称 64GB，系统可见约 61GiB，Swap 8GiB                               |
| GPU         | 两张 Tesla V100-SXM2-16GB                                            |
| 卡间连接    | `nvidia-smi topo -m` 显示 `NV6`                                      |
| 磁盘        | Colorful SL500 512GB SATA SSD，系统显示约 476.9GiB                   |
| NVIDIA 驱动 | `580.178.04`                                                         |
| 容器工具    | Docker `29.8.1`，Compose `v5.5.1`，NVIDIA Container Toolkit `1.20.1` |
| Strata      | 应用 `0.2.1`，引擎 `0.1.46`                                          |

模型的两片 GGUF 分工不同。第一片 47.04GB，装着核心的 transformer 权重；第二片 28.80GB，存着 per-layer n-gram embedding 查找表，可以留在 SSD 上通过内存映射按需翻阅，不必硬塞进显存。[模型仓库文档](https://huggingface.co/ISTA-DASLab/Qwen3.8-Flash-Next-GSQ-RCO-GGUF/blob/ed59f92082b1e93c0e96d60a8b11aab089b52f09/README.md#available-files)里写明了两者的体积和用途。

在这台机器上，GPU 0 跑第 0～24 层，GPU 1 跑第 25～47 层，另有约 30.73GiB 的专家数据常驻主机内存。

为了省下空间给 256K 长上下文，KV 缓存压到了 INT8，每个 QSA 层在显存里只留 32768 个 cells，其余全部溢到主机内存。64GB 内存在这里被吃得很紧——后面跑满长上下文测试时，系统可用内存一度跌到只剩 4.29GiB。

## 为什么退回 CUDA 12

翻看 [NVIDIA 支持矩阵](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html)，Volta 架构的计算能力停在 7.0，最后支持的 Toolkit 是 CUDA 12.x，驱动定格在 R580 分支。

哪怕宿主机的 580.178.04 驱动在 `nvidia-smi` 右上角标着 `CUDA Version: 13.0`，那也只是驱动层面的兼容上限，真拿 CUDA 13 去编译 `sm_70` 是行不通的。这里我们在容器里用 CUDA 12.8.93 编译。

宿主机只要装好驱动、Docker 和 NVIDIA Container Toolkit 即可。如果你手头已经有现成的 GPU 容器环境，直接跳到本节末尾跑一行检查命令就行；新机器的初始化脚本折在下面。

<details>
<summary>Ubuntu 26.04 基础环境安装</summary>

安装介质可从 [Ubuntu 官方站](https://releases.ubuntu.com/26.04/)或[清华镜像站](https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/26.04/)获取。安全更新遵循[清华镜像建议](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/)，保留官方源。

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

确认驱动属于 580 分支后重启机器。

```bash
reboot
```

重连后安装 Docker，可按网络环境选用[清华 Docker CE 镜像](https://mirrors4.tuna.tsinghua.edu.cn/help/docker-ce/)或[官方源](https://docs.docker.com/engine/install/ubuntu/)。

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

接着配置 NVIDIA Container Toolkit（[中科大镜像](https://mirrors.ustc.edu.cn/help/libnvidia-container.html)或[官方源](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)）：

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

重启 Docker 让运行时配置生效：

```bash
systemctl restart docker
nvidia-ctk --version
```

</details>

拉起一个最小 CUDA 容器，确认里面能同时看到两张 V100：

```bash
CUDA_IMAGE=docker.1ms.run/nvidia/cuda:12.8.1-runtime-ubuntu24.04
# CUDA_IMAGE=nvidia/cuda:12.8.1-runtime-ubuntu24.04
docker run --rm --gpus all "${CUDA_IMAGE}" nvidia-smi
```

## 下载两片权重与视觉投影

宿主机通过 `uv` 调起 Hugging Face CLI 下载模型。若机器上还没有 `uv`，可以先从 GitHub Releases（或经由 [GH-Proxy](https://gh-proxy.com/)）装好二进制文件，细节见 [uv 安装文档](https://docs.astral.sh/uv/getting-started/installation/#github-releases)：

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

两片权重加上视觉文件约 76.75GB，后续首次启动还要下载约 1.5GiB 的 pack 和 6.5GiB 的 MTP，磁盘上最好预留 100GB 以上的余量。下面通过 [HF-Mirror](https://hf-mirror.com/) 拉取固定 revision 的文件：

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

保持两片 GGUF 的原始文件名不变，启动时只传第一片路径即可。顺手把 `mmproj` 复制一份到 Strata 数据目录，免去启动时重复下载：

```bash
install -D -m 0644 \
  /srv/llm/models/qwen/Qwen3.8-Flash-Next-GSQ-RCO/mmproj-Qwen3.8-Flash-Next-BF16.gguf \
  /srv/llm/strata-data/Strata-data/models/mmproj-Qwen3.8-Flash-Next-BF16.gguf
```

## 编译 sm_70 引擎

[Strata 的 V100 文档](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/NVIDIA_V100.md)里藏着编译要领：CUDA 12、架构填 `70`，再打开 `STRATA_EXPERIMENTAL_SM60=ON`。这个开关名字写着 SM60，实际上也管着 Volta 的放行。

先把固定 commit 的 Strata 与 llama.cpp 源码拉下来：

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

接着写入 `/srv/llm/strata-build/Dockerfile.v100`。构建阶段借用了 1Cat-vLLM 镜像里现成的 CUDA 12.8.93 与 GCC 11.4.0，运行阶段则切回 Strata `0.2.1-cuda12`，顺带把负责图片编码的 `strata-vision` 拷进新组件目录：

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

开始构建镜像（直连 Docker Hub 与 GHCR 时可去掉两行 `--build-arg`）：

```bash
docker build --progress=plain \
  --build-arg BUILD_IMAGE=docker.1ms.run/shig249/1cat-vllm-1.5.0@sha256:013c033c7e088fe6d4eb95887d0a617eca4a38c73fa66423ec81fe3c4b90e576 \
  --build-arg RUNTIME_IMAGE=ghcr.1ms.run/niko1221/strata@sha256:e9b978fbf119ceddae7c1fd980a69e11bec96b149e33be77524b3601838c62d2 \
  -f /srv/llm/strata-build/Dockerfile.v100 \
  -t local/strata:0.2.1-cuda12-sm70 /srv/llm/strata-build
```

看到日志里打出 `CUDA enabled, arch 70`，这一步就算稳了。

## 启动与视觉配置

先生成一份本地 API Key：

```bash
cd /srv/llm
install -d -m 0700 /srv/llm/strata-data/state
if [ ! -f /srv/llm/strata-data/state/api-key ]; then
  (umask 077; openssl rand -hex 32 > /srv/llm/strata-data/state/api-key)
fi
```

将下面的配置保存为 `/srv/llm/docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml`（如需局域网访问，把 `127.0.0.1` 换成内网 IP）：

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

首次启动会自动补齐 pack 和 MTP，下载源可通过环境变量切换：

| 下载入口            | Compose 环境变量                                                        |
| ------------------- | ----------------------------------------------------------------------- |
| Hugging Face 官方源 | `STRATA_SOURCE: huggingface`                                            |
| HF-Mirror           | `STRATA_SOURCE: huggingface`，另加 `HF_ENDPOINT: https://hf-mirror.com` |
| ModelScope          | `STRATA_SOURCE: modelscope`（示例默认）                                 |

`STRATA_SET` 里的几项数字就是前面算过的内存账：`resident-budget-gib=32` 划出主机内存里的专家缓存预算，`kv-resident=32768` 限制显存内的 KV 窗口，每张卡再留出 1536MiB 余量。图片编码放在 CPU 上跑，批量 MTP 开启。完整参数表可以查阅 [Strata Docker 文档](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/DOCKER.md)。

确认双卡空闲后拉起容器：

```bash
cd /srv/llm
nvidia-smi
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  config --quiet
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  up -d
docker logs -f --tail 100 strata-qwen38-flash-next-iq3-xxs
```

把 30 多 GiB 的专家缓存搬进主机内存需要一点耐心，实机光是这一步就花了约 149 秒。等日志平稳后，按 `Ctrl+C` 退出来查一下健康接口：

```bash
curl --noproxy '*' --max-time 10 -fsS http://127.0.0.1:8080/health | jq .
```

看到 `loaded=true`、`images=true`、`max_context=262144` 就说明就绪了。

CPU 视觉编码默认只给 300 个视觉 tokens。想看清细节，可以在首次生成配置文件后停掉容器，把预算调到 1024、线程设为 16，再重新启动：

```bash
cd /srv/llm
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml stop

VISION_CONFIG=/srv/llm/strata-data/install/strata-iq3_xxs.json
jq '.vision.max_tokens = 1024 | .vision.threads = 16' \
  "${VISION_CONFIG}" > "${VISION_CONFIG}.tmp" && \
  mv "${VISION_CONFIG}.tmp" "${VISION_CONFIG}"

docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml up -d
```

## 第一条请求与日常巡检

服务就绪后，读出密钥发一条短请求试试水：

```bash
STRATA_API_KEY=$(cat /srv/llm/strata-data/state/api-key)
STRATA_URL=http://127.0.0.1:8080

curl --noproxy '*' --fail-with-body -sS \
  "${STRATA_URL}/v1/chat/completions" \
  -H "Authorization: Bearer ${STRATA_API_KEY}" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "qwen3.8-flash-next-iq3_xxs",
    "messages": [{"role": "user", "content": "用两句话解释数据库事务原子性。"}],
    "max_tokens": 4096,
    "stream": false
  }' | jq .
```

配置里默认把思考强度设成了 `high`，如果只想要简短回复，可以在请求体里加上 `"reasoning_effort": "none"`。

需要排查运行状态或观察内存水位时，通常看这四条输出：

```bash
docker logs --tail 100 strata-qwen38-flash-next-iq3-xxs
free -h
nvidia-smi
docker stats --no-stream strata-qwen38-flash-next-iq3-xxs
```

## 256K 长输入要等多久

短对话很快，但一旦把上下文推到 256K 边缘，等待时间就会陡增。

| 场景             | 输入 tokens | 结果                                              |
| ---------------- | ----------- | ------------------------------------------------- |
| 短输入单请求     | 76          | 引擎报告生成速度约 62 tokens/s                    |
| 短输入双请求     | 每条 76     | 每路约 37.7、39.8 tokens/s                        |
| 长请求 1，附五图 | 257861      | 文本三处校验码和五图数字均正确，总耗时约 931.5 秒 |
| 长请求 2，附五图 | 257868      | 文本三处校验码和五图数字均正确，总耗时约 738.7 秒 |

长上下文测试在接近 258K tokens 的文本头、中、尾各埋了一处校验码，同时附上五张数字图片。两条并发请求都没有命中缓存，虽然找出了全部校验码和图片数字，但算上图片编码、长文本预填充和思考生成，整条请求足足跑了 12 到 16 分钟。

紧接着追问一轮，命中 257856 tokens 缓存的那一路用了约 100.9 秒；另一路 `cached_tokens=0` 重新计算，又花了 365.5 秒。

长测期间，主机可用内存最低只剩 4.29GiB，每张 V100 的显存余量也只有 1GiB 左右，Swap 开始轻微介入。靠着内存卸载，两张老卡确实能把 256K 的多模态大模型稳稳端起来，但面对几十万字的长文预填充，算力与带宽的物理边界依然诚实。
