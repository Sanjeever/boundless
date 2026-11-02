---
title: 双卡 V100 部署 ComfyUI 与 MiniMax H3
date: 2026-11-02
tags:
  - AI
  - 本地部署
  - 视频生成
  - GPU
description: 用 Docker 在两张 16GB V100 上部署 ComfyUI 与 MiniMax H3，从权重下载、精度适配走到文生视频与图生视频。
outline: deep
aside: true
---

# 双卡 V100 部署 ComfyUI 与 MiniMax H3

<!-- DESC SEP -->

用 Docker 在两张 16GB V100 上部署 ComfyUI 与 MiniMax H3，从权重下载、精度适配走到文生视频与图生视频。

<!-- DESC SEP -->

一艘帆船缓缓穿过金色湖面。远岸压成一道细线，船尾拖着涟漪。播放器走完一遍，五秒多。

生成这样一段画面，两张 16GB V100 也能胜任。配合 64GB 主机内存，本次实测首次生成约需三分多钟，模型载入后约需一分半钟。

下面按实际部署顺序，把环境要求、权重下载、镜像构建与使用方法串起来。手头若也有 V100，可以从这套已验证配置起步。

[MiniMax H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) 负责生成视频与同步音频，[ComfyUI](https://github.com/Comfy-Org/ComfyUI/tree/v0.43.0) 负责把模型加载、输入编码、采样和解码组织成工作流。同一套 FL2VA 权重既能接受纯文字，也能接受首帧图片，分别完成文生视频与图生视频。

## 先确认环境与资源

本次环境如下，后文命令均在 Linux Bash 中执行，以 root 用户为例，需要 `curl`、`tar` 与 `jq`。

| 项目 | 配置 |
| --- | --- |
| GPU | 两张 Tesla V100-SXM2 16GB，NVLink 互联 |
| CPU | Xeon E5-2686 v4，18 核 36 线程 |
| 内存 | 标称 64GB，系统可见约 61GiB |
| 磁盘 | 512GB SATA SSD，建议预留至少 80GB 空间 |
| 宿主机 | Ubuntu 26.04.1 LTS，NVIDIA 驱动 580.178.04 |
| 容器环境 | Docker 29.8.1、Compose v5.5.1，已配置 NVIDIA Container Toolkit |

先确认驱动与容器工具正常。GPU 环境初始化可以参考[前文](/posts/2026/10/23-v100-strata-iq3-xxs)，这里从已有 GPU 容器环境继续。

```bash
apt-get update
apt-get install -y curl jq tar
nvidia-smi
docker --version
docker compose version
```

如果机器还在运行其他大模型，先停止对应服务，确认显存和主机内存已经释放。`pause` 会保留内存与显存，这里应使用 `stop`。

这台机器原先运行 Qwen，容器占用约 44GiB 内存，每张卡各占约 15GiB 显存。停止服务后，系统可用内存回到约 52GiB，才有空间容纳视频模型。

## 下载 FL2VA 权重

本篇采用 FL2VA。主模型约 21GB，文本编码器约 15.7GB，加上视频与音频 VAE、8 步 Turbo LoRA，合计约 44.4GB。VAE 在这里负责把内部压缩表示还原成画面或声音。

<details>
<summary>五个权重文件</summary>

以下文件来自 [Comfy-Org 模型仓库](https://huggingface.co/Comfy-Org/MiniMax-H3)，本次通过 ModelScope 下载。

| 目录 | 文件 |
| --- | --- |
| `diffusion_models/` | `minimax_h3_fl2va_pruned_fp8_scaled.safetensors` |
| `text_encoders/` | `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` |
| `vae/` | `minimax_h3_video_vae_fp16.safetensors` |
| `vae/` | `minimax_h3_audio_vae_fp32.safetensors` |
| `loras/` | `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` |

</details>

建立目录，然后通过 ModelScope 下载。下面命令按文件逐个执行，支持断点续传；已有完整文件会跳过。

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

44.4GB 是磁盘体积，运行时还要为反量化结果、临时张量与解码画面留出余量。

## V100 需要单独处理精度

`nvidia-smi` 右上角写着 CUDA 13.0，看起来很新。可 [NVIDIA 支持矩阵](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html) 把 Volta 留在 CUDA 12.x，计算能力为 `sm_70`。驱动展示兼容上限，具体程序能否运行，还要看它有没有带上这代显卡。

这次基础镜像固定为 `pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime`，容器内使用 Python 3.12 与 [PyTorch 2.12.1+cu126](https://pytorch.org/get-started/previous-versions/)。核对编译架构时，列表里确实能找到 `sm_70`。

在 [ComfyUI 0.43.0 原生实现](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/comfy/supported_models.py#L907) 中，H3 支持 BF16 与 FP32 推理。V100 缺少原生 BF16 支持，走 FP32 路径会增加计算与存储负担。直接强制 FP16，又可能因激活溢出得到 NaN，最后交出一张黑图。

模型文件名写着 FP8，也不会替显卡补上原生 FP8 算力。这里先用较小体积保存权重，真正计算时，再沿兼容路径展开。

最终采用 [FP16Safe](https://github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tree/4badf245c757932ad776c0dd799500428400fb17) 插件。大矩阵乘尽量交给 FP16，残差等关键计算保留 FP32，并在容易溢出之处调整数值尺度。文本编码器使用 NVFP4/AWQ 权重，视频 VAE 使用 FP16，音频 VAE 使用 FP32。

权重采用低精度存储，计算仍需按组件选择兼容路径，不能把整个流程统一强制成 FP16。

## 构建固定版本镜像

先拉取基础镜像，确认 Torch 能识别两张卡，并在编译架构列表中找到 `sm_70`。

```bash
docker pull pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime

docker run --rm --gpus all --entrypoint uv \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  run --no-project --offline python -c \
  'import torch; print(torch.__version__); print(torch.cuda.device_count()); print(torch.cuda.get_arch_list())'
```

若 Docker Hub 直连不通，可改用下面镜像源，再补回官方镜像标签。

```bash
docker pull docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime &&
docker tag \
  docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime
```

接着下载 ComfyUI 0.43.0 与固定提交版本 FP16Safe。不要在这一步直接追随最新分支，后文工作流按这组版本验证。

```bash
cd /srv/comfyui-h3/build

curl -fL --retry 3 \
  https://codeload.github.com/Comfy-Org/ComfyUI/tar.gz/refs/tags/v0.43.0 \
  -o comfyui-v0.43.0.tar.gz

curl -fL --retry 3 \
  https://codeload.github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tar.gz/4badf245c757932ad776c0dd799500428400fb17 \
  -o fp16safe-4badf245.tar.gz
```

将下面内容保存为 `/srv/comfyui-h3/build/main_v100.py`。入口先处理参数与 CUDA 内存分配器，再导入 comfy-kitchen，避免两者选择不同 allocator。

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

这里关闭 comfy-kitchen 自带 CUDA 与 Triton 后端，使用 eager 实现。Torch 仍然在 V100 上运行。启动参数同时关闭 Comfy 编译器与 CUDA graphs，注意力计算使用 PyTorch 路径。

再保存 `/srv/comfyui-h3/build/Dockerfile`。基础镜像已包含 `uv`，下面通过它安装依赖，并保留 Torch 与 torchvision 版本约束。

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

构建镜像。

```bash
cd /srv/comfyui-h3
docker build --pull=false -t local/comfyui-h3:v100-0.43.0 build
```

## 配置 Compose 并启动

用 [Docker Compose](https://docs.docker.com/compose/) 管理服务。将下面内容保存为 `/srv/comfyui-h3/docker-compose.yml`。

模型目录只读挂载，输入、输出与用户工作流保留在宿主机。示例将 8188 绑定到本机回环地址。

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
      test: ['CMD', 'uv', 'run', '--no-project', '--offline', 'python', '-c', 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8188/system_stats", timeout=5).read()']
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

检查配置并启动，等日志出现服务监听信息后，再查询状态。

```bash
cd /srv/comfyui-h3
docker compose config --quiet
docker compose up -d
docker compose logs --tail 100 -f
```

按 `Ctrl+C` 退出日志查看，不会停止容器。

```bash
curl -fsS http://127.0.0.1:8188/system_stats
```

本机浏览器打开 `http://127.0.0.1:8188`。如果服务运行在远程服务器，在自己电脑上建立 SSH 转发，将 `user@server` 换成实际登录地址，再访问同一网址。

```bash
ssh -L 8188:127.0.0.1:8188 user@server
```

## 导入工作流并生成视频

ComfyUI 把过程铺在画布上。一段提示词先进入文本编码器，随后连向 H3 采样，再分别经过视频与音频解码，最后汇入保存节点。

下面两份工作流已经配好模型、8 步 Turbo、FP16Safe 与双卡设备分工。下载后拖入 ComfyUI 画布即可。

- <a href="/downloads/posts/2026/11/minimax-h3-t2v-v100.json" download>文生视频工作流</a>
- <a href="/downloads/posts/2026/11/minimax-h3-i2v-v100.json" download>图生视频工作流</a>
- <a href="/downloads/posts/2026/11/h3-validation.png" download>验证用首帧图片</a>

**文生视频**打开第一份工作流，在「提示词与视频参数」节点输入画面与声音描述，例如“夕阳下，一艘帆船缓慢驶过湖面，镜头固定，伴随轻微水声”。点击右上角「运行」，完成后在保存节点或任务历史中预览、下载。

**图生视频**打开第二份工作流，在「首帧图片」节点上传图片，再描述希望发生什么，例如“保持船身与构图，帆船缓慢前行，水面泛起涟漪”。也可以先上传上方验证图片，保持默认提示词，检查整条流程。

先保持 `608×352`、124 帧、24fps、8 步这组参数，成片约 5.17 秒。宽高需为 32 倍数，帧数使用 `17k + 5`；后续提高分辨率或延长视频时，逐档观察资源占用。

工作流中，主模型先经过 Turbo LoRA，再进入 FP16Safe，最后接采样器。文本编码器应选 H3 专用 Qwen3-VL 权重，类型保持 `minimax`。生成新样本时修改随机种子；相同参数可能复用缓存。

下面样片先通过文生视频生成湖面，再提取首帧送入图生视频工作流。默认输出保存在宿主机 `/srv/comfyui-h3/output/H3/`。

<video
  controls
  playsinline
  preload="metadata"
  src="/videos/posts/2026/11/minimax-h3-v100-i2v.mp4"
  aria-label="双卡 V100 生成帆船视频，608×352，约五秒"
  style="width: 100%; max-width: 608px"
></video>

双卡图生视频样片，608×352，124 帧，24fps，附带 32kHz 双声道音轨。

## 双卡分工与实测速度

这套工作流采用按阶段分工，物理 GPU 0 接手文本编码器、视频 VAE 与音频 VAE，物理 GPU 1 承担 H3 采样。

两张卡之间能通过 NVLink 通信，容器也能同时看到它们。不过，`gpus: all` 只负责把设备交给容器，具体计算仍需工作流安排。两份 16GB 显存也不会自动变成一张 32GB 显卡。

编码、采样、解码依次进行，采样本身仍由一张卡执行，所以这里不应预期速度翻倍。

设备映射有个容易绕晕人之处。容器设置 `CUDA_VISIBLE_DEVICES=1,0`，所以工作流中 `gpu:0` 对应物理 GPU 1，`gpu:1` 才对应物理 GPU 0。三个原生设备选择节点需要填 `gpu:1`，才能把编码与解码移到另一张卡。

下表固定 608×352、124 帧、8 步，每组提示词和种子保持一致。首次生成包含模型加载，没有清空操作系统文件缓存，每种场景各做一次配对。

| 场景 | 单卡 | 双卡分工 |
| --- | --- | --- |
| 服务启动后首次生成 | 195.3 秒 | 196.5 秒 |
| 同提示词换种子 | 78.4 秒 | 77.6 秒 |
| 模型已加载，修改提示词 | 84.7 秒 | 81.9 秒 |

采样每步仍在 8.3 秒左右，整段耗时变化很小。这几秒差异，还不足以支撑稳定加速结论。

内存余量变化更明显。测试采样阶段，单卡可用系统内存约 5–10GiB，双卡约 18–24GiB。这些是阶段观察值，尚未做连续峰值统计。

本次据此采用双卡分工，主要收益是内存余量增加。若想回退到单卡，将三个设备选择节点均设为 `gpu:0`，编码、采样、解码便会集中到物理 GPU 1。

双卡图生视频另做一次热运行，约 91.9 秒完成，画面、首帧保持与音轨检查通过。720p、更长片段与跨卡并行采样尚未测试，不能沿用本表耗时。

## 通过 HTTP 接入程序

ComfyUI 同时提供 HTTP 服务，可以将生成流程接进其他程序。

程序调用沿用 [ComfyUI 原生接口](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/server.py)，按异步任务处理。

先上传图片，文生视频跳过这步；把 API 格式工作流提交到 `POST /prompt`，拿到 `prompt_id`；接着查询 `GET /history/{prompt_id}`，成功后按返回文件信息，从 `GET /view` 下载 MP4。

画布 JSON 与 API 请求体需要区分。本文提供前端画布文件；程序接入时，先在 ComfyUI 中导出 API 格式工作流，再包进请求体 `prompt` 字段。

假设 API 导出文件保存为 `workflow-api.json`，可以这样提交。

```bash
jq '{prompt: .}' workflow-api.json > request.json

curl --fail-with-body -sS http://127.0.0.1:8188/prompt \
  -H 'Content-Type: application/json' \
  --data-binary @request.json
```

任务编号刚返回时，湖面还没出现。程序此时该记住编号，过几秒再问一次，直到成功、失败或超时。相同参数可能命中缓存；想让同一段描述再生出一幅画面，还需要换个种子。

查询历史时，返回空对象可能表示任务尚在排队或运行，应结合 `/queue` 判断。成功状态位于 `history[prompt_id].status.status_str`，值为 `success`；若值为 `error`，应读取 `status.messages` 中异常信息并停止轮询。

当前工作流使用节点 16 保存视频，结果位于 `history[prompt_id].outputs["16"].images[0]`，其中包含文件名、子目录和类型。视频输出同样使用 `images` 字段，下载时将这三个字段传给 `/view`。

## 日常检查

遇到显存不足、生成停滞或页面无法访问时，先看容器日志与资源状态。

```bash
cd /srv/comfyui-h3
docker compose ps
docker compose logs --tail 100
nvidia-smi
free -h
df -h /srv
```

重启服务使用 `docker compose restart`；修改 Compose 配置后使用 `docker compose up -d`。输入图片、输出视频与用户工作流都挂载在宿主机，备份时优先保留 `input/`、`output/`、`user/` 和部署配置。

先让这五秒视频稳定走完，再慢慢扩大画幅。
