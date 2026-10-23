---
title: 双卡 V100 运行 Qwen3.8-Flash-Next
date: 2026-10-23
tags:
  - AI
  - 本地部署
  - GPU
description: 为双 V100 编译 Strata，借助 64GB 主机内存运行 Qwen3.8-Flash-Next IQ3_XXS，记录部署过程与长上下文等待时间。
outline: deep
aside: true
---

# 双卡 V100 运行 Qwen3.8-Flash-Next

<!-- DESC SEP -->

双 V100 16GB 加 64GB 内存，可以运行 Qwen3.8-Flash-Next IQ3_XXS。需要为 Volta 编译 Strata，并把部分专家与 KV 缓存放进主机内存。短请求生成约 62 tokens/s，两条近满 256K 输入各带五图，请求耗时却达到 12～16 分钟。

<!-- DESC SEP -->

IQ3_XXS 两片 GGUF 合计约 75.84GB，双卡显存总共 32GB，无法容纳完整权重。Strata 把专家缓存分布在 GPU 和主机内存，再按需读取 SSD，让模型能在这套硬件上运行。

另一个门槛来自 V100 架构。现成 Strata 引擎未覆盖 `sm_70`，需要用 CUDA 12 单独编译。下面围绕这两个问题展开，命令在 Ubuntu 服务器 Bash 中以 root 执行。配置取自实机，安装命令按文档整理，尚未在空系统上完整重装。

## 硬件与内存分配

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

两片文件承担不同任务。第一片约 47.04GB，保存 transformer 权重；第二片约 28.80GB，保存 per-layer n-gram embedding 查找表，可以留在 SSD，通过内存映射按需访问。第二片不能省略，也不必全部装进显存。[模型仓库](https://huggingface.co/ISTA-DASLab/Qwen3.8-Flash-Next-GSQ-RCO-GGUF/blob/ed59f92082b1e93c0e96d60a8b11aab089b52f09/README.md#available-files)给出文件用途与体积。

本机按层分配双卡，GPU 0 运行第 0～24 层，GPU 1 运行第 25～47 层，约 30.73GiB 专家数据驻留主机内存。长上下文还要占用 KV 缓存，因此采用 INT8，每个 QSA 层在显存保留 32768 个 cells，其余放在主机内存。64GB 内存在这里承担实际负载，后文长测期间可用内存最低约 4.29GiB。

## V100 需要 CUDA 12

[NVIDIA 支持矩阵](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html)列出 Volta 计算能力为 7.0，最后支持 CUDA 12.x，最后驱动分支为 R580。本机采用 580.178.04 驱动，容器内使用 CUDA 12.8.93 编译。`nvidia-smi` 顶部显示 `CUDA Version: 13.0`，表示驱动支持上限，不能据此改用 CUDA 13 编译 V100 引擎。

宿主机需要驱动、Docker 和 NVIDIA Container Toolkit，CUDA 编译环境由镜像提供。已有 GPU 容器环境可以直接看本节末尾检查命令；新环境安装放在下面。下载默认使用国内入口，代码注释保留官方源。

<details>
<summary>Ubuntu 26.04 基础环境安装</summary>

安装介质可从 [Ubuntu 官方站](https://releases.ubuntu.com/26.04/)或[清华镜像站](https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/26.04/)下载。下面源配置用于新装 Ubuntu 26.04 x86_64，已有自定义源时按实际情况调整。安全更新遵循[清华建议](https://mirrors.tuna.tsinghua.edu.cn/help/ubuntu/)，保留官方入口。

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

确认驱动包仍属 580 分支。安装后重启，SSH 会断开。

```bash
reboot
```

重新登录后安装 Docker。软件包采用[清华 Docker CE 镜像](https://mirrors4.tuna.tsinghua.edu.cn/help/docker-ce/)，也可切换[官方仓库](https://docs.docker.com/engine/install/ubuntu/)。已有 Docker 时先核对官方文档中冲突包说明。

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

NVIDIA Container Toolkit 使用[中科大镜像](https://mirrors.ustc.edu.cn/help/libnvidia-container.html)或[官方源](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)。

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

重启 Docker 会影响现有容器，需提前安排停机。

```bash
systemctl restart docker
nvidia-ctk --version
```

</details>

用 CUDA 容器检查双卡是否可见。`docker.1ms.run` 沿用实机下载入口，官方源为 Docker Hub。

```bash
CUDA_IMAGE=docker.1ms.run/nvidia/cuda:12.8.1-runtime-ubuntu24.04
# CUDA_IMAGE=nvidia/cuda:12.8.1-runtime-ubuntu24.04
docker run --rm --gpus all "${CUDA_IMAGE}" nvidia-smi
```

容器内能看到两张 V100，再继续下载和编译。

## 两片权重都要下载

宿主机通过 uv 调用 Hugging Face CLI。先选 GitHub 下载入口，安装 uv 和获取源码都会用到 `GITHUB_PREFIX`。下面采用 [GH-Proxy](https://gh-proxy.com/)，直连时留空。已有 uv 可以略过后续安装命令，二进制发布方式见[官方文档](https://docs.astral.sh/uv/getting-started/installation/#github-releases)。

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

模型与视觉文件约 76.75GB，另外还有 pack 约 1.5GiB、MTP 约 6.5GiB，以及构建镜像和缓存。留足磁盘空间后创建目录，下载两片 GGUF 和 `mmproj`。Python 包用清华 PyPI，模型用 [HF-Mirror](https://hf-mirror.com/)，注释中保留官方入口。

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

revision 与下文固定版本 Strata 源码一致。两片保留原文件名，启动时指向第一片。把视觉文件复制到 Strata 数据目录，安装器会复用本地文件。

```bash
install -D -m 0644 \
  /srv/llm/models/qwen/Qwen3.8-Flash-Next-GSQ-RCO/mmproj-Qwen3.8-Flash-Next-BF16.gguf \
  /srv/llm/strata-data/Strata-data/models/mmproj-Qwen3.8-Flash-Next-BF16.gguf
```

## 编译 sm_70 引擎

[Strata V100 文档](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/NVIDIA_V100.md)给出社区实验构建入口。关键是 CUDA 12、架构参数 `70` 和 `STRATA_EXPERIMENTAL_SM60=ON`。这个开关虽然名为 SM60，也负责放行 Volta。

下载固定版本 Strata 与 llama.cpp 源码，避免编译结果随主分支变化。`GITHUB_PREFIX` 仍可选择直连或国内代理。

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

保存下面内容为 `/srv/llm/strata-build/Dockerfile.v100`。构建阶段借用 1Cat-vLLM 镜像内 CUDA 12.8.93 和 GCC 11.4.0，运行阶段使用 Strata `0.2.1-cuda12`。两个 digest 来自实机构建日志。

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

`strata-vision` 负责图片编码，也要复制到新组件目录。

本机通过 `docker.1ms.run` 与 `ghcr.1ms.run` 拉取镜像。使用官方 Docker Hub 和 GHCR 时，省略下面两行 `--build-arg`，Dockerfile 默认值就会生效。

```bash
docker build --progress=plain \
  --build-arg BUILD_IMAGE=docker.1ms.run/shig249/1cat-vllm-1.5.0@sha256:013c033c7e088fe6d4eb95887d0a617eca4a38c73fa66423ec81fe3c4b90e576 \
  --build-arg RUNTIME_IMAGE=ghcr.1ms.run/niko1221/strata@sha256:e9b978fbf119ceddae7c1fd980a69e11bec96b149e33be77524b3601838c62d2 \
  -f /srv/llm/strata-build/Dockerfile.v100 \
  -t local/strata:0.2.1-cuda12-sm70 /srv/llm/strata-build
```

构建日志应出现 `CUDA enabled, arch 70`。若代理返回 `manifest unknown`，核对镜像同步状态或切回官方源，保留相同 digest。

## 配置并启动模型

模型目录挂载到 `/models`，持久数据挂载到 `/data`。先创建 API Key，已有密钥继续复用。

```bash
cd /srv/llm
install -d -m 0700 /srv/llm/strata-data/state
if [ ! -f /srv/llm/strata-data/state/api-key ]; then
  (umask 077; openssl rand -hex 32 > /srv/llm/strata-data/state/api-key)
fi
```

保存为 `/srv/llm/docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml`。局域网访问时，将端口绑定中 `127.0.0.1` 改成服务器内网 IP，后文请求地址同步调整。

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

首次启动还需准备 pack 和 MTP，下载入口在 Compose 中选择。

| 下载入口            | Compose 环境变量                                                        |
| ------------------- | ----------------------------------------------------------------------- |
| Hugging Face 官方源 | `STRATA_SOURCE: huggingface`                                            |
| HF-Mirror           | `STRATA_SOURCE: huggingface`，另加 `HF_ENDPOINT: https://hf-mirror.com` |
| ModelScope          | `STRATA_SOURCE: modelscope`，即上面示例                                 |

宿主机环境变量不会自动进入容器。Hugging Face 路径使用固定 revision，ModelScope 使用当前文件，切换时留意版本差异。

资源配置中，`resident-budget-gib=32` 控制主机专家缓存，`kv-resident=32768` 缩小 KV 显存驻留窗口，每卡另预留 1536MiB。图片放在 CPU，开启批量 MTP，自动调优与专家跳过均关闭。这组参数沿用实机，[Strata Docker 文档](https://github.com/Niko1221/Strata/blob/a7bdbfdabc9a/docs/DOCKER.md)可查完整说明。

`256k` 是每会话 262144 tokens 上限，输入、图片、思考和输出共用这份预算。内存较少或另有 GPU 进程时，先降低上下文和并发。释放双卡后启动。

```bash
cd /srv/llm
nvidia-smi
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  config --quiet
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml \
  up -d
docker logs -f --tail 100 strata-qwen38-flash-next-iq3-xxs
```

加载主机专家缓存也需要时间，本机仅这一阶段就约 149 秒。按 `Ctrl+C` 退出日志跟随，用健康接口判断是否就绪。

```bash
curl --noproxy '*' --max-time 10 -fsS http://127.0.0.1:8080/health | jq .
```

确认 `loaded=true`、`images=true`、`max_context=262144`。

CPU 图片编码默认预算为 300 个视觉 tokens，本机改为 1024，使用 16 线程。要复现图片设置，在首次生成配置后停止服务，修改预算，再启动。

```bash
cd /srv/llm
docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml stop

VISION_CONFIG=/srv/llm/strata-data/install/strata-iq3_xxs.json
jq '.vision.max_tokens = 1024 | .vision.threads = 16' \
  "${VISION_CONFIG}" > "${VISION_CONFIG}.tmp" && \
  mv "${VISION_CONFIG}.tmp" "${VISION_CONFIG}"

docker compose -f docker-compose-strata-qwen3.8-flash-next-iq3-xxs.yml up -d
```

重新等待健康检查通过。删除生成配置或重新安装模型后，需要再次核对图片预算。

## 发出第一条请求

健康检查通过后，读取 API Key，在服务器上发送短请求。

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

默认思考为 `high`，请求中增加 `"reasoning_effort": "none"` 可以关闭。输出预算包含思考，返回 `finish_reason=length` 时需检查正文是否完整。

Strata 自带 Web UI，支持对话和图片上传。绑定内网 IP 后，在浏览器打开 `http://服务器内网IP:8080/` 即可验证图片。本机通过工具调用往返和两组五图数字识别；五张是验证数量，当前配置没有五图硬上限。

修改 Compose 后用 `up -d` 应用参数，普通 `restart` 不会重建配置。模型目录、本地镜像和 `/srv/llm/strata-data` 都需保留，数据目录保存 pack、MTP、视觉组件与密钥。运行异常时先看日志、内存和显存。

```bash
docker logs --tail 100 strata-qwen38-flash-next-iq3-xxs
free -h
nvidia-smi
docker stats --no-stream strata-qwen38-flash-next-iq3-xxs
```

## 长输入会等多久

| 场景             | 输入 tokens | 结果                                              |
| ---------------- | ----------- | ------------------------------------------------- |
| 短输入单请求     | 76          | 引擎报告生成速度约 62 tokens/s                    |
| 短输入双请求     | 每条 76     | 每路约 37.7、39.8 tokens/s                        |
| 长请求 1，附五图 | 257861      | 文本三处校验码和五图数字均正确，总耗时约 931.5 秒 |
| 长请求 2，附五图 | 257868      | 文本三处校验码和五图数字均正确，总耗时约 738.7 秒 |

长测在文本前、中、后部埋入校验码，每条附五张数字卡片。两条独立新请求均未命中缓存，目标答案正确，但都以 `length` 结束，后续输出触及预算上限。短测速率取自引擎生成统计，也使用固定输出预算，包含思考和正文。表中吞吐与请求总耗时衡量不同阶段，不能直接互算。

追问也未必快。一路命中 257856 tokens 缓存，总耗时约 100.9 秒；另一路 `cached_tokens=0`，耗时约 365.5 秒。长历史是否复用，需要查看 `usage.prompt_tokens_details.cached_tokens`。

长测期间可用内存最低约 4.29GiB，双卡显存余量约 1GiB，Swap 同时存在占用。记录中没有 OOM 或容器自动重启，资源余量仍然紧张。这些结果来自校验码与数字图片样例，尚未覆盖长期多用户运行和真实代码仓库任务。
