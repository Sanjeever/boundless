---
title: 双卡 V100 部署 ComfyUI 与 MiniMax H3
date: 2026-11-02
tags:
  - AI
  - 本地部署
  - 视频生成
  - GPU
description: 在两张 16GB V100 上用 Docker 跑通 ComfyUI 与 MiniMax H3，绕开 FP16 溢出黑图，从文字或首帧图片生成带音轨的短片。
outline: deep
aside: true
---

# 双卡 V100 部署 ComfyUI 与 MiniMax H3

<!-- DESC SEP -->

在两张 16GB V100 上用 Docker 跑通 ComfyUI 与 MiniMax H3，绕开 FP16 溢出黑图，从文字或首帧图片生成带音轨的短片。

<!-- DESC SEP -->

五秒钟的画面里，一艘红帆船缓缓划过日出时的湖面，船尾拖开细碎的涟漪，耳机里传来水波拍岸和远处的鸟鸣。

这段带音轨的视频，出自那台插着两张 16GB V100 的旧服务器。前几天它还在跑 [Qwen3.8 长上下文](/posts/2026/10/23-v100-strata-iq3-xxs)，用 `docker stop` 停掉语言模型容器后，占着的 44GiB 内存和每张卡 15GiB 显存才真正松手（`pause` 会把它们留在原地），系统重新空出 52GiB 内存。

第一次点下运行，风扇转了三分多钟。等权重在内存和显存里安顿下来，一分半钟就能洗出一段五秒的短片。

## 44.4GB 的五份权重

一行文字怎么变成画面与声音？翻看 [Comfy-Org 整理的模型仓库](https://huggingface.co/Comfy-Org/MiniMax-H3)，目录下躺着五个文件，加起来 44.4GB。

核心是 21GB 的 [MiniMax H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) `FL2VA` 扩散模型。它把文生视频和图生视频合在了同一份权重里。不接图片时，模型从纯噪声里凭空推演；递过去一张首帧图片，那张图就成为整段轨迹的起点。

提示词和首帧画面先交给 15.7GB 的 `Qwen3-VL 32B` 编码器（NVFP4/AWQ 量化）转成条件向量。采样时挂上 1.96GB 的 `8 步 Turbo LoRA`，把漫长的去噪过程收束到 8 步。等潜空间里的张量成形，守在末端的两个 VAE 再各自接手，5.2GB 的视频 VAE（FP16）还原出 24fps 的连续画面，605MB 的音频 VAE（FP32）解出 32kHz 双声道音轨。

[ComfyUI](https://github.com/Comfy-Org/ComfyUI/tree/v0.43.0) 做的事，就是把这五块拼图铺在画布上，连成一条从左往右的流水线。

这台服务器的配置沿用[上一篇笔记](/posts/2026/10/23-v100-strata-iq3-xxs)里的 GPU 容器环境：

| 项目     | 配置                                                   |
| -------- | ------------------------------------------------------ |
| GPU      | 两张 Tesla V100-SXM2 16GB，NVLink 互联                 |
| CPU      | Xeon E5-2686 v4，18 核 36 线程                         |
| 内存     | 标称 64GB，系统可见约 61GiB                            |
| 磁盘     | 512GB SATA SSD，建议预留至少 80GB 空间                 |
| 宿主机   | Ubuntu 26.04.1 LTS，NVIDIA 驱动 `580.178.04`           |
| 容器环境 | Docker `29.8.1`、Compose `v5.5.1`，已配置 GPU 容器支持 |

确认驱动、容器工具与基础命令就绪：

```bash
apt-get update
apt-get install -y curl jq tar
nvidia-smi
docker --version
docker compose version
```

建好目录，从 ModelScope 拉回五份权重。脚本支持断点续传，落盘后会核对文件字节数：

```bash
mkdir -p /srv/comfyui-h3/{build,models,input,output,user,cache}
cd /srv/comfyui-h3

(
  set -eu
  model_url=https://modelscope.cn/models/Comfy-Org/MiniMax-H3/resolve/master

  while read -r file expected_size; do
    target="models/$file"
    mkdir -p "$(dirname "$target")"

    if [ -f "$target" ] && [ "$(stat -c %s "$target")" -eq "$expected_size" ]; then
      continue
    fi

    curl --fail --location --continue-at - --retry 3 \
      --connect-timeout 30 \
      --output "$target.part" "$model_url/$file"
    test "$(stat -c %s "$target.part")" -eq "$expected_size"
    mv -- "$target.part" "$target"
  done <<'FILES'
diffusion_models/minimax_h3_fl2va_pruned_fp8_scaled.safetensors 20958205608
text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors 15687142551
vae/minimax_h3_video_vae_fp16.safetensors 5207808496
vae/minimax_h3_audio_vae_fp32.safetensors 605254808
loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors 1956193000
FILES
)
```

## 65504 的边界与黑图

权重落盘后，如果直接照默认配置在 V100 上运行，等待三分多钟后，播放器里只会看到五秒钟的纯黑画面。

问题出在两代硬件的缝隙里。

宿主机 `nvidia-smi` 右上角标着 `CUDA Version: 13.0`，那只是 580 驱动兼容的上限。[NVIDIA 支持矩阵](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html)里，Volta 架构（`sm_70`）停留在 CUDA 12.x。容器基础镜像因此固定为 `pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime`，里面的 [PyTorch 2.12.1+cu126](https://pytorch.org/get-started/previous-versions/) 仍带着 `sm_70` 的算子。

更隐蔽的边界在浮点数的指数位上。

[ComfyUI 0.43.0 原生代码](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/comfy/supported_models.py#L907)里，H3 走 `BF16` 或 `FP32` 推理。主模型文件名里的 `fp8` 只是磁盘与显存里的压缩打包格式；V100 发布于 2017 年，既没有原生 `FP8`，也不认识后来 Ampere 架构才引入的 `BF16`。

把 21GB 的模型在 16GB 显存里全展开成 `FP32` 并不现实。可一旦强行切到 V100 原生支持的 `FP16`，数值范围就突然收窄了：`BF16` 有 8 位指数，上限与 `FP32` 一样在 $3.4 \times 10^{38}$；`FP16` 只有 5 位指数，最大只能表示到 `65504`。

H3 的残差流与注意力层在累加中间激活值时，数字很容易越过 `65504` 变成 `NaN`。一个张量出现 `NaN`，整条采样链随之失真，解码出来的画面便只剩一片黑幕。

[FP16Safe 插件](https://github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tree/4badf245c757932ad776c0dd799500428400fb17)在两者之间做了一次拆解：吃算力的大矩阵乘法继续交给 `FP16` 跑在 Tensor Core 上，容易越界的残差主干留在 `FP32`，并在敏感算子前后预先缩放数值尺度。

## 固定版本的容器镜像

拉取基础镜像，确认 PyTorch 能识别两张卡，且编译架构列表里包含 `sm_70`：

```bash
docker pull pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime

docker run --rm --gpus all --entrypoint uv \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  run --no-project --offline python -c \
  'import torch; print(torch.__version__); print(torch.cuda.device_count()); print(torch.cuda.get_arch_list())'
```

若 Docker Hub 直连较慢，可先从镜像源拉取再改回原标签：

```bash
docker pull docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime &&
docker tag \
  docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime
```

把 ComfyUI `v0.43.0` 与对应提交的 `FP16Safe` 源码包下载到构建目录：

```bash
cd /srv/comfyui-h3/build

curl -fL --retry 3 \
  https://codeload.github.com/Comfy-Org/ComfyUI/tar.gz/refs/tags/v0.43.0 \
  -o comfyui-v0.43.0.tar.gz

curl -fL --retry 3 \
  https://codeload.github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tar.gz/4badf245c757932ad776c0dd799500428400fb17 \
  -o fp16safe-4badf245.tar.gz
```

写一个七行的启动入口 `/srv/comfyui-h3/build/main_v100.py`：

```python
import runpy

import comfy.options

comfy.options.enable_args_parsing()
import cuda_malloc
import comfy_kitchen

comfy_kitchen.disable_backend('cuda')
comfy_kitchen.disable_backend('triton')
runpy.run_path('main.py', run_name='__main__')
```

`comfy-kitchen` 自带的自定义 CUDA 与 Triton 后端没有针对 Volta 适配，若在参数解析前导入，还会与 `cuda_malloc` 争抢内存分配器。这里先完成参数解析和分配器初始化，再关掉这两个自定义后端，退回 PyTorch 原生算子。

保存 `/srv/comfyui-h3/build/Dockerfile`，用基础镜像自带的 `uv` 安装依赖，并锁住原有的 Torch 版本：

```dockerfile
FROM pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime

ENV DEBIAN_FRONTEND=noninteractive \
    UV_PYTHON_DOWNLOADS=never UV_NO_CACHE=1 PYTHONUNBUFFERED=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY comfyui-v0.43.0.tar.gz fp16safe-4badf245.tar.gz /tmp/
RUN mkdir -p /opt/ComfyUI/custom_nodes/ComfyUI-MiniMaxH3-FP16Safe && \
    tar -xzf /tmp/comfyui-v0.43.0.tar.gz \
      -C /opt/ComfyUI --strip-components=1 && \
    tar -xzf /tmp/fp16safe-4badf245.tar.gz \
      -C /opt/ComfyUI/custom_nodes/ComfyUI-MiniMaxH3-FP16Safe \
      --strip-components=1 && \
    rm /tmp/comfyui-v0.43.0.tar.gz /tmp/fp16safe-4badf245.tar.gz

WORKDIR /opt/ComfyUI
RUN printf 'torch==2.12.1+cu126\ntorchvision==0.27.1+cu126\n' \
      > /opt/torch-constraints.txt && \
    uv pip install --system --break-system-packages \
      --constraint /opt/torch-constraints.txt -r requirements.txt && \
    uv pip freeze --system > /opt/installed-requirements.txt

COPY main_v100.py /opt/ComfyUI/main_v100.py
EXPOSE 8188
CMD ["uv", "run", "--no-project", "--offline", "python", "main_v100.py", "--listen", "0.0.0.0", "--port", "8188", "--default-device", "1", "--disable-comfy-compiler", "--disable-cuda-graphs", "--disable-triton-backend", "--disable-xformers", "--use-pytorch-cross-attention", "--reserve-vram", "0.5"]
```

构建镜像：

```bash
cd /srv/comfyui-h3
docker build --pull=false -t local/comfyui-h3:v100-0.43.0 build
```

用 [Docker Compose](https://docs.docker.com/compose/) 管理容器，将下面配置保存为 `/srv/comfyui-h3/docker-compose.yml`：

```yaml
name: comfyui-h3
services:
  comfyui:
    image: local/comfyui-h3:v100-0.43.0
    pull_policy: never
    container_name: comfyui-h3
    restart: 'no'
    gpus: all
    ports:
      - '127.0.0.1:8188:8188'
    shm_size: 2gb
    stop_grace_period: 30s
    environment:
      CUDA_VISIBLE_DEVICES: '1,0'
      OMP_NUM_THREADS: '8'
      MKL_NUM_THREADS: '8'
      HF_HUB_OFFLINE: '1'
    volumes:
      - ./models:/opt/ComfyUI/models:ro
      - ./input:/opt/ComfyUI/input
      - ./output:/opt/ComfyUI/output
      - ./user:/opt/ComfyUI/user
      - ./cache:/root/.cache
    healthcheck:
      test:
        [
          'CMD',
          'uv',
          'run',
          '--no-project',
          '--offline',
          'python',
          '-c',
          'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8188/system_stats", timeout=5).read()',
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 90s
    logging:
      driver: json-file
      options:
        max-size: 10m
        max-file: '3'
```

启动服务并观察日志：

```bash
cd /srv/comfyui-h3
docker compose config --quiet
docker compose up -d
docker compose logs --tail 100 -f
```

等日志出现监听提示后，按 `Ctrl+C` 退出日志流，测试一下状态接口：

```bash
curl -fsS http://127.0.0.1:8188/system_stats
```

在远端服务器上运行时，从本地电脑建一条 SSH 隧道，即可在浏览器访问 `http://127.0.0.1:8188`：

```bash
ssh -L 8188:127.0.0.1:8188 user@server
```

## 画布上的连线与五秒湖面

打开浏览器里的 ComfyUI 画布，可以直接拖入下面配好的工作流：

- <a href="/downloads/posts/2026/11/minimax-h3-t2v-v100.json" download>文生视频工作流</a>
- <a href="/downloads/posts/2026/11/minimax-h3-i2v-v100.json" download>图生视频工作流</a>
- <a href="/downloads/posts/2026/11/h3-validation.png" download>验证用首帧图片</a>

两份工作流的中央都摆着同一个节点：`MiniMaxH3ImageToVideo`（画布上标为「提示词与视频参数」）。

文生视频里，这个节点的 `first_frame` 输入口悬空着。在文本框写下画面与声音，比如「夕阳下，一艘帆船缓慢驶过湖面，镜头固定，伴随轻微水声」，主模型挂上 `8 步 Turbo` LoRA，穿过 `V100 混合精度`节点，在采样器里跑完 8 步去噪，再分头交给视频与音频解码器。

图生视频多了一步：左边放一个「首帧图片」节点，把图片连进 `first_frame`。可以先上传上面的验证图片，提示词写「保持船身与构图，帆船缓慢前行，水面泛起涟漪」，画面就会顺着首帧的光影继续往下走。

工作流默认设在 `608×352`、124 帧、24fps、8 步，成片约 5.17 秒。宽高需为 32 的倍数，帧数按 `17k + 5` 递增。`H3 文本编码器`节点选专用 Qwen3-VL 权重，类型保持 `minimax`。由于相同输入会命中 ComfyUI 的缓存，同一段提示词想再抽一次卡时，改一下「随机种子」里的数字即可。

下面这段样片先由文生视频生成湖面，再抽出首帧送入图生视频工作流。输出文件默认落在宿主机 `/srv/comfyui-h3/output/H3/`。

<div>
<video
  controls
  playsinline
  preload="metadata"
  src="/videos/posts/2026/11/minimax-h3-v100-i2v.mp4"
  aria-label="双卡 V100 生成帆船视频，608×352，约五秒"
  style="width: 100%; max-width: 608px"
></video>
</div>

## 两张卡的接力

两张 V100 之间连着 NVLink，容器也开了 `gpus: all`，但把单卡和双卡的耗时摆在一起，秒表上的数字几乎没有拉开差距：

| 场景                   | 单卡     | 双卡分工 |
| ---------------------- | -------- | -------- |
| 服务启动后首次生成     | 195.3 秒 | 196.5 秒 |
| 同提示词换种子         | 78.4 秒  | 77.6 秒  |
| 模型已加载，修改提示词 | 84.7 秒  | 81.9 秒  |

两张 16GB 显卡并不会在容器里自动合并成一张 32GB 的大卡。编码提示词、8 步去噪采样、解码音视频这三个阶段前后相接，最耗时的采样依然在一张卡上逐步推进，每步约 8.3 秒（双卡图生视频热运行一趟约 91.9 秒）。

双卡真正改变的是主机内存的余量。

如果所有节点都挤在同一张 16GB 显卡上，显存装不下全套模型，ComfyUI 只能在阶段切换时把上一阶段的权重退回系统内存，再把下一阶段的权重搬进显存。采样期间，主机可用内存会被压到 5～10GiB。

把阶段拆开后，物理 GPU 0 接管文本编码器与两个 VAE，物理 GPU 1 专门留给 21GB 的 H3 采样模型。省去了显存与内存之间的来回腾挪，采样时主机可用内存一直留在 18～24GiB。

这里有一处设备编号的反转：`docker-compose.yml` 里设了 `CUDA_VISIBLE_DEVICES: '1,0'`，因此画布上的 `gpu:0` 对应物理 GPU 1，`gpu:1` 才对应物理 GPU 0。工作流左侧的三个设备选择节点（`SelectCLIPDevice` 与两个 `SelectVAEDevice`）填 `gpu:1`，正是为了把编码和解码挪到物理 GPU 0 上；若想退回单卡运行，把这三个节点改成 `gpu:0` 即可。

## 经由 HTTP 投递任务

除了在画布上手动点击运行，也可以通过 [ComfyUI 的 HTTP 接口](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/server.py)从外部程序投递任务。

画布保存的 JSON 带有前端布局信息，不能直接作为请求体。先在 ComfyUI 菜单中导出 **API 格式**工作流（存为 `workflow-api.json`），包进 `prompt` 字段后发往 `POST /prompt`：

```bash
jq '{prompt: .}' workflow-api.json > request.json

curl --fail-with-body -sS http://127.0.0.1:8188/prompt \
  -H 'Content-Type: application/json' \
  --data-binary @request.json
```

拿到返回的 `prompt_id` 后，每隔几秒轮询一次 `GET /history/{prompt_id}`（排队或运行中可能返回空对象，可配合 `/queue` 查看进度）。

等 `history[prompt_id].status.status_str` 变为 `"success"`，从 `history[prompt_id].outputs["16"].images[0]` 取出 `filename`、`subfolder` 和 `type`（节点 16 是保存视频节点，视频输出同样挂在 `images` 字段下），传给 `GET /view` 即可取回 MP4。若状态变为 `"error"`，报错详情记录在 `status.messages` 中。

遇到生成停滞或显存吃紧时，可以用下面几条命令查看容器日志与资源水位：

```bash
cd /srv/comfyui-h3
docker compose ps
docker compose logs --tail 100
nvidia-smi
free -h
df -h /srv
```

先让这五秒钟的湖面平稳跑通，再试着把画幅一点点推开。
