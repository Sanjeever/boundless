---
title: Running ComfyUI and MiniMax H3 on Two V100s
date: 2026-11-02
tags:
  - AI
  - Local Deployment
  - Video Generation
  - GPU
description: Deploy ComfyUI and MiniMax H3 with Docker on two 16GB V100s, from downloading weights and handling precision to generating video from text and images.
outline: deep
aside: true
---

# Running ComfyUI and MiniMax H3 on Two V100s

<!-- DESC SEP -->

Deploy ComfyUI and MiniMax H3 with Docker on two 16GB V100s, from downloading weights and handling precision to generating video from text and images.

<!-- DESC SEP -->

A sailboat moves slowly across a golden lake. The far shore is a thin line, with ripples trailing behind the hull. One pass through the player takes a little over five seconds.

Two 16GB V100s can generate that scene. With 64GB of host RAM, this setup took just over three minutes for the first clip and about a minute and a half once the models were loaded.

This guide follows the deployment from prerequisites and weight downloads through the image build and the first video. If you have a similar V100 machine, it provides a tested starting configuration.

[MiniMax H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) generates the video and synchronized audio. [ComfyUI](https://github.com/Comfy-Org/ComfyUI/tree/v0.43.0) arranges model loading, input encoding, sampling, and decoding into a workflow. The same FL2VA weights accept either text alone or a starting image, covering both text-to-video and image-to-video generation.

## Hardware and prerequisites

The machine used for these measurements has the following configuration. Commands below run in Bash on Linux as root and require `curl`, `tar`, and `jq`.

| Item | Configuration |
| --- | --- |
| GPUs | Two Tesla V100-SXM2 16GB cards connected by NVLink |
| CPU | Xeon E5-2686 v4, 18 cores and 36 threads |
| RAM | Nominal 64GB, about 61GiB visible to the OS |
| Disk | 512GB SATA SSD; leave at least 80GB free for this setup |
| Host | Ubuntu 26.04.1 LTS, NVIDIA driver 580.178.04 |
| Containers | Docker 29.8.1 and Compose v5.5.1, with NVIDIA Container Toolkit configured |

First, check the driver and container tools. The [earlier V100 guide](/en/posts/2026/10/23-v100-strata-iq3-xxs) covers host initialization; the steps here assume GPU containers already work.

```bash
apt-get update
apt-get install -y curl jq tar
nvidia-smi
docker --version
docker compose version
```

If another large model is running, stop its service and confirm that it has released both VRAM and host RAM. `pause` retains those allocations; use `stop` here.

This server previously ran Qwen, whose container occupied about 44GiB of RAM and 15GiB of VRAM on each card. Stopping it brought available system memory back to roughly 52GiB, leaving room for the video model.

## Download the FL2VA weights

This setup uses FL2VA. The main model is about 21GB, the text encoder about 15.7GB, and the video VAE, audio VAE, and 8-step Turbo LoRA bring the total to approximately 44.4GB. The VAEs turn compressed internal representations back into images and sound.

<details>
<summary>The five weight files</summary>

These files come from the [Comfy-Org model repository](https://huggingface.co/Comfy-Org/MiniMax-H3). They were downloaded through ModelScope for this deployment.

| Directory | File |
| --- | --- |
| `diffusion_models/` | `minimax_h3_fl2va_pruned_fp8_scaled.safetensors` |
| `text_encoders/` | `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` |
| `vae/` | `minimax_h3_video_vae_fp16.safetensors` |
| `vae/` | `minimax_h3_audio_vae_fp32.safetensors` |
| `loras/` | `minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors` |

</details>

Create the directories, then download the files from ModelScope. The following block downloads them sequentially, resumes partial downloads, and skips files that already match the expected size.

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

That 44.4GB describes the files on disk. Runtime memory must also accommodate dequantized weights, temporary tensors, and decoded frames.

## Precision on a V100

The CUDA 13.0 label in `nvidia-smi` can be misleading. The [NVIDIA support matrix](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html) lists CUDA 12.x as Volta's final supported toolkit series, with compute capability `sm_70`. The driver reports its compatibility ceiling; the application still needs support for the actual GPU architecture.

The base image here is `pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime`, providing Python 3.12 and [PyTorch 2.12.1+cu126](https://pytorch.org/get-started/previous-versions/). Its compiled architecture list includes `sm_70`.

In the [ComfyUI 0.43.0 implementation](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/comfy/supported_models.py#L907), H3 supports BF16 and FP32 inference. A V100 lacks native BF16 support, while the FP32 path increases compute and memory costs. Forcing FP16 throughout the model can overflow activations, producing NaNs and black frames.

An FP8 filename does not give the card native FP8 compute. The weights are stored compactly, then expanded through a compatible execution path.

This setup uses [FP16Safe](https://github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tree/4badf245c757932ad776c0dd799500428400fb17). It keeps large matrix multiplications in FP16 where possible, retains FP32 for critical calculations such as the residual stream, and rescales values around operations prone to overflow. The text encoder uses NVFP4/AWQ weights, the video VAE runs in FP16, and the audio VAE runs in FP32.

Low-precision storage and compute precision are separate choices. Each component needs a compatible path rather than one global FP16 override.

## Build a pinned image

Pull the base image and check that Torch detects both cards and lists `sm_70` among its compiled architectures.

```bash
docker pull pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime

docker run --rm --gpus all --entrypoint uv \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  run --no-project --offline python -c \
  'import torch; print(torch.__version__); print(torch.cuda.device_count()); print(torch.cuda.get_arch_list())'
```

If Docker Hub is unreachable from your network, the following mirror was used for this deployment. Retag the image so the build can use the official image name.

```bash
docker pull docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime &&
docker tag \
  docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime
```

Download ComfyUI 0.43.0 and the pinned FP16Safe commit. Keep these versions for the initial setup; the workflows below were checked against this combination.

```bash
cd /srv/comfyui-h3/build

curl -fL --retry 3 \
  https://codeload.github.com/Comfy-Org/ComfyUI/tar.gz/refs/tags/v0.43.0 \
  -o comfyui-v0.43.0.tar.gz

curl -fL --retry 3 \
  https://codeload.github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tar.gz/4badf245c757932ad776c0dd799500428400fb17 \
  -o fp16safe-4badf245.tar.gz
```

Save the following as `/srv/comfyui-h3/build/main_v100.py`. It initializes argument parsing and the CUDA allocator before importing comfy-kitchen, so both use the same allocator configuration.

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

This disables comfy-kitchen's custom CUDA and Triton backends in favor of its eager implementation. Torch still executes on the V100. The launch arguments also disable the Comfy compiler and CUDA graphs and select PyTorch attention.

Save `/srv/comfyui-h3/build/Dockerfile` next. The base image already includes `uv`; the build uses it to install dependencies while constraining the Torch and torchvision versions.

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

Build the image.

```bash
cd /srv/comfyui-h3
docker build --pull=false -t local/comfyui-h3:v100-0.43.0 build
```

## Start ComfyUI with Compose

Use [Docker Compose](https://docs.docker.com/compose/) to manage the service. Save the following as `/srv/comfyui-h3/docker-compose.yml`.

The models are mounted read-only. Inputs, outputs, and user workflows remain on the host. This example binds port 8188 to the host's loopback address.

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

Check the configuration and start the service. Wait for the listening message in the logs before checking the endpoint.

```bash
cd /srv/comfyui-h3
docker compose config --quiet
docker compose up -d
docker compose logs --tail 100 -f
```

Press `Ctrl+C` to leave the log stream. The container keeps running.

```bash
curl -fsS http://127.0.0.1:8188/system_stats
```

Open `http://127.0.0.1:8188` in a browser on the host. For a remote server, establish an SSH tunnel from your own computer, replacing `user@server` with the actual login address, then open the same URL locally.

```bash
ssh -L 8188:127.0.0.1:8188 user@server
```

## Import a workflow and generate a video

ComfyUI lays the process out on a canvas. A prompt enters the text encoder, feeds into H3 sampling, passes through separate video and audio decoders, and ends at a save node.

These workflows already include the models, 8-step Turbo LoRA, FP16Safe, and GPU placement. Download a file and drag it onto the ComfyUI canvas.

- <a href="/downloads/posts/2026/11/minimax-h3-t2v-v100.json" download>Text-to-video workflow</a>
- <a href="/downloads/posts/2026/11/minimax-h3-i2v-v100.json" download>Image-to-video workflow</a>
- <a href="/downloads/posts/2026/11/h3-validation.png" download>Sample first-frame image</a>

For **text-to-video**, open the first workflow and enter a scene and sound description in the node titled `提示词与视频参数` (prompt and video settings). For example, try “A sailboat moves slowly across a lake at sunset, fixed camera, soft water sounds.” Click **Run** in the upper-right corner. Once it finishes, preview or download the result from the save node or task history.

For **image-to-video**, open the second workflow and upload an image in the node titled `首帧图片` (first-frame image). Describe what should happen next, such as “Preserve the boat and composition, let the sailboat move slowly forward, with ripples spreading across the water.” You can also upload the sample image above and keep the default prompt to check the complete pipeline.

Start with **608×352, 124 frames, 24fps, and 8 steps**, which produces about 5.17 seconds of video. Width and height must be multiples of 32, and frame counts follow `17k + 5`. When increasing resolution or duration, move up gradually and watch resource usage.

The main model passes through the Turbo LoRA before FP16Safe, then connects to the sampler. Use the H3-specific Qwen3-VL text encoder and keep its type set to `minimax`. Change the random seed for a new sample; identical inputs may reuse cached results.

The clip below started as text-to-video. Its first frame was then extracted and used in the image-to-video workflow. The default output directory on the host is `/srv/comfyui-h3/output/H3/`.

<video
  controls
  playsinline
  preload="metadata"
  src="/videos/posts/2026/11/minimax-h3-v100-i2v.mp4"
  aria-label="Sailboat video generated on two V100s, 608 by 352 pixels, about five seconds"
  style="width: 100%; max-width: 608px"
></video>

Image-to-video sample using both cards: 608×352, 124 frames, 24fps, with a 32kHz stereo audio track.

## GPU placement and measured performance

This workflow assigns different stages to different cards. Physical GPU 0 handles the text encoder and both VAEs, while physical GPU 1 handles H3 sampling.

The cards can communicate over NVLink, and both are visible inside the container. However, `gpus: all` only exposes the devices; the workflow still has to place the work. Two 16GB cards do not automatically become one 32GB GPU.

Encoding, sampling, and decoding follow their dependencies in sequence. Sampling itself still runs on one card, so this arrangement should not be expected to double the speed.

The device numbering needs care. With `CUDA_VISIBLE_DEVICES=1,0`, workflow device `gpu:0` maps to physical GPU 1, and `gpu:1` maps to physical GPU 0. The three native device-selection nodes therefore use `gpu:1` to move encoding and decoding onto the other card.

The comparison below uses 608×352, 124 frames, and 8 steps, with matching prompts and seeds within each pair. The first generation includes model loading. The OS file cache was not cleared, and each scenario was measured once per configuration.

| Scenario | One GPU | Stages split across two GPUs |
| --- | --- | --- |
| First generation after service startup | 195.3 s | 196.5 s |
| Same prompt, new seed | 78.4 s | 77.6 s |
| Models loaded, prompt changed | 84.7 s | 81.9 s |

Sampling stayed at roughly 8.3 seconds per step, and overall latency changed very little. A difference of a few seconds in these measurements is not enough to establish a consistent speedup.

Available host memory showed a larger difference. During sampling, it was observed at about 5–10GiB for the single-GPU configuration and 18–24GiB with the stages split. These are point-in-time observations, not continuously collected peak-memory statistics.

The tested deployment uses both cards primarily for that extra memory headroom. To return to one card, set all three device-selection nodes to `gpu:0`; encoding, sampling, and decoding will then use physical GPU 1.

A separate image-to-video run with the models already loaded completed in about 91.9 seconds. Frame inspection, first-frame preservation, and the audio track checks passed. Higher resolutions such as 720p, longer clips, and sampling distributed across both GPUs were not tested, so the timings above do not cover those cases.

## Call the HTTP API

ComfyUI also exposes an HTTP service for integrating generation into other programs.

Use its [native endpoints](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/server.py) as an asynchronous job API.

Upload an image first for image-to-video, or skip that step for text-to-video. Submit the API-format workflow to `POST /prompt` and save the returned `prompt_id`. Poll `GET /history/{prompt_id}` until the job succeeds, then download the MP4 through `GET /view` using the returned file information.

The canvas JSON and API request formats are different. The downloads in this guide are canvas workflows. For programmatic use, export the workflow in API format from ComfyUI and wrap it in a `prompt` field.

If the API export is saved as `workflow-api.json`, submit it like this.

```bash
jq '{prompt: .}' workflow-api.json > request.json

curl --fail-with-body -sS http://127.0.0.1:8188/prompt \
  -H 'Content-Type: application/json' \
  --data-binary @request.json
```

A returned job ID is not a finished video. Keep the ID and poll every few seconds until success, failure, or a timeout. Identical inputs may hit the cache; change the seed when you want another sample from the same prompt.

An empty history response may mean the job is queued or running, so check `/queue` as well. Success is reported by `history[prompt_id].status.status_str == "success"`. If the value is `error`, read the exception information in `status.messages` and stop polling.

These workflows save video through node 16. Its file information appears at `history[prompt_id].outputs["16"].images[0]`, containing the filename, subfolder, and type. Video results also use the `images` field; pass those three values to `/view` to download the file.

## Routine checks

If generation runs out of VRAM, stalls, or the page becomes unreachable, inspect the container logs and resource usage first.

```bash
cd /srv/comfyui-h3
docker compose ps
docker compose logs --tail 100
nvidia-smi
free -h
df -h /srv
```

Use `docker compose restart` to restart the service and `docker compose up -d` after changing the Compose configuration. Input images, generated videos, and user workflows are mounted from the host. Prioritize `input/`, `output/`, `user/`, and the deployment configuration when making backups.

Get a stable five-second clip first, then increase the canvas a little at a time.
