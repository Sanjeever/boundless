---
title: Running ComfyUI and MiniMax H3 on Two V100s
date: 2026-11-02
tags:
  - AI
  - Local Deployment
  - Video Generation
  - GPU
description: Running ComfyUI and MiniMax H3 on two 16GB V100s with Docker, bypassing FP16 black-frame overflows to generate five-second clips with sound from text or a starting image.
outline: deep
aside: true
---

# Running ComfyUI and MiniMax H3 on Two V100s

<!-- DESC SEP -->

Running ComfyUI and MiniMax H3 on two 16GB V100s with Docker, bypassing FP16 black-frame overflows to generate five-second clips with sound from text or a starting image.

<!-- DESC SEP -->

For just over five seconds, a small red sailboat drifts across a sunrise lake. Ripples trail behind the hull, while soft water lapping and distant birdsong play through the audio track.

Both the frames and the stereo sound came out of the same older server with two 16GB V100s that was running [256K-context Qwen3.8 tests](/en/posts/2026/10/23-v100-strata-iq3-xxs) a few days ago. Stopping that language model container with `docker stop` freed the 44GiB of system RAM and 15GiB of VRAM per card it had been holding (`pause` leaves those allocations in place), bringing available host memory back to roughly 52GiB.

The first run after launch took a little over three minutes while the weights settled into memory. Once warm, the server turns a prompt into a five-second clip in about a minute and a half.

## Five weight files totaling 44.4GB

How does a line of text turn into moving pictures and synchronized sound? A glance at the [Comfy-Org MiniMax H3 repository](https://huggingface.co/Comfy-Org/MiniMax-H3) shows five files totaling 44.4GB.

At the center sits the 21GB [MiniMax H3](https://huggingface.co/MiniMaxAI/MiniMax-H3) `FL2VA` diffusion model, which folds text-to-video and image-to-video into a single set of weights. Leave the image input empty and it dreams from pure noise; feed it a starting frame and that picture becomes the opening boundary of the trajectory.

Prompts and reference frames first pass through a 15.7GB `Qwen3-VL 32B` encoder (quantized to NVFP4/AWQ) to become conditioning vectors. During sampling, a 1.96GB `8-step Turbo LoRA` compresses the denoising schedule down to 8 Euler steps. Once the latent tensor takes shape, two VAEs at the exit unpack it into media: a 5.2GB video VAE (FP16) reconstructs 24fps frames, while a 605MB audio VAE (FP32) decodes a 32kHz stereo waveform.

[ComfyUI](https://github.com/Comfy-Org/ComfyUI/tree/v0.43.0) lays those five pieces out on a canvas as a left-to-right dataflow graph.

The server hosting them carries over the GPU container setup from the [earlier V100 note](/en/posts/2026/10/23-v100-strata-iq3-xxs):

| Item       | Configuration                                                           |
| ---------- | ----------------------------------------------------------------------- |
| GPUs       | Two Tesla V100-SXM2 16GB cards connected over NVLink                    |
| CPU        | Xeon E5-2686 v4, 18 cores and 36 threads                                |
| RAM        | Nominal 64GB, about 61GiB visible to the OS                             |
| Disk       | 512GB SATA SSD; leave at least 80GB free                                |
| Host       | Ubuntu 26.04.1 LTS, NVIDIA driver `580.178.04`                          |
| Containers | Docker `29.8.1`, Compose `v5.5.1`, with NVIDIA Container Toolkit set up |

Check that the driver, container runtime, and command-line tools are ready:

```bash
apt-get update
apt-get install -y curl jq tar
nvidia-smi
docker --version
docker compose version
```

Create the working directories under `/srv/comfyui-h3` and pull the five weight files from ModelScope. The loop resumes partial downloads and checks each file's byte count on disk:

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

## The 65504 ceiling and black frames

With the weights on disk, running a stock ComfyUI setup on a V100 will spin the fans for three minutes and hand back five seconds of pitch-black video.

The trouble sits in the gap between hardware generations.

In the corner of `nvidia-smi`, the host prints `CUDA Version: 13.0`, which only reflects the R580 driver's compatibility ceiling. In the [NVIDIA support matrix](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html), Volta (`sm_70`) stops at CUDA 12.x. The container therefore builds on `pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime`, where [PyTorch 2.12.1+cu126](https://pytorch.org/get-started/previous-versions/) still includes compiled `sm_70` kernels.

A subtler boundary lies in the exponent bits of the floating-point format.

In [ComfyUI 0.43.0's native code](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/comfy/supported_models.py#L907), H3 runs inference in `BF16` or `FP32`. The `fp8` label in the main checkpoint's filename is only a compact storage format on disk and in VRAM; released in 2017, the V100 has neither native `FP8` nor the `BF16` format introduced later with Ampere.

Expanding a 21GB model into full `FP32` inside a 16GB card is out of reach. Yet forcing the graph into the V100's native `FP16` narrows the dynamic range sharply: `BF16` uses an 8-bit exponent that reaches $3.4 \times 10^{38}$ just like `FP32`, whereas `FP16` has only 5 exponent bits and tops out at `65504`.

As activations accumulate down H3's residual stream and attention blocks, intermediate values easily cross `65504` and turn into `NaN`. Once a single tensor goes `NaN`, it spreads through the remaining sampling steps, leaving the decoder with nothing but a black screen.

The [FP16Safe custom node](https://github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tree/4badf245c757932ad776c0dd799500428400fb17) splits the work cleanly: heavy matrix multiplications stay in `FP16` on the V100's Tensor Cores, while the residual stream remains in `FP32` and activations prone to spiking are rescaled before they can overflow.

## A pinned container image

Pull the base image and confirm that PyTorch detects both cards and includes `sm_70` in its architecture list:

```bash
docker pull pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime

docker run --rm --gpus all --entrypoint uv \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  run --no-project --offline python -c \
  'import torch; print(torch.__version__); print(torch.cuda.device_count()); print(torch.cuda.get_arch_list())'
```

If Docker Hub is slow from your network, pull from a mirror and retag the image:

```bash
docker pull docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime &&
docker tag \
  docker.m.daocloud.io/pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime \
  pytorch/pytorch:2.12.1-cuda12.6-cudnn9-runtime
```

Download the source tarballs for ComfyUI `v0.43.0` and the pinned `FP16Safe` commit into the build directory:

```bash
cd /srv/comfyui-h3/build

curl -fL --retry 3 \
  https://codeload.github.com/Comfy-Org/ComfyUI/tar.gz/refs/tags/v0.43.0 \
  -o comfyui-v0.43.0.tar.gz

curl -fL --retry 3 \
  https://codeload.github.com/aaalll12322/ComfyUI-MiniMaxH3-FP16Safe/tar.gz/4badf245c757932ad776c0dd799500428400fb17 \
  -o fp16safe-4badf245.tar.gz
```

Create a seven-line entrypoint at `/srv/comfyui-h3/build/main_v100.py`:

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

The custom CUDA and Triton backends bundled in `comfy-kitchen` are not built for Volta, and importing `comfy-kitchen` before argument parsing would initialize CUDA before `cuda_malloc` configures the allocator. Running `comfy.options` and `cuda_malloc` first, then switching `comfy-kitchen` to eager mode, keeps execution on standard PyTorch kernels.

Save `/srv/comfyui-h3/build/Dockerfile`, using the base image's `uv` binary to install dependencies while locking the preinstalled Torch build:

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

Build the image:

```bash
cd /srv/comfyui-h3
docker build --pull=false -t local/comfyui-h3:v100-0.43.0 build
```

Manage the service with [Docker Compose](https://docs.docker.com/compose/) by saving `/srv/comfyui-h3/docker-compose.yml`:

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

Start the container and follow the logs:

```bash
cd /srv/comfyui-h3
docker compose config --quiet
docker compose up -d
docker compose logs --tail 100 -f
```

Once the listening message appears, press `Ctrl+C` to leave the log stream and check the stats endpoint:

```bash
curl -fsS http://127.0.0.1:8188/system_stats
```

When running on a remote machine, open an SSH tunnel from your local computer and visit `http://127.0.0.1:8188` in a browser:

```bash
ssh -L 8188:127.0.0.1:8188 user@server
```

## Wiring the canvas and the five-second lake

Drag either of these preconfigured workflows onto the ComfyUI canvas:

- <a href="/downloads/posts/2026/11/minimax-h3-t2v-v100.json" download>Text-to-video workflow</a>
- <a href="/downloads/posts/2026/11/minimax-h3-i2v-v100.json" download>Image-to-video workflow</a>
- <a href="/downloads/posts/2026/11/h3-validation.png" download>Sample first-frame image</a>

At the center of both graphs sits the same node: `MiniMaxH3ImageToVideo` (titled `提示词与视频参数` on the canvas).

In the text-to-video workflow, its `first_frame` input stays unconnected. Enter a scene and sound description—for instance, _"A sailboat moves slowly across a lake at sunset, fixed camera, soft water sounds"_—while the main model passes through the `8 步 Turbo` LoRA and the `V100 混合精度` (`MiniMaxH3FP16Safe`) node, runs 8 denoising steps in the sampler, and branches into the video and audio decoders.

The image-to-video workflow adds a `LoadImage` node (`首帧图片`) on the left, wired into `first_frame`. Upload the sample validation image above and describe the motion that should follow, such as _"Preserve the boat and composition, let the sailboat move slowly forward, with ripples spreading across the water."_

Both workflows start at `608×352`, 124 frames, 24fps, and 8 steps, producing a 5.17-second clip. Width and height must be multiples of 32, and frame counts follow `17k + 5`. Keep the `CLIPLoader` node (`H3 文本编码器`) pointed at the H3-specific Qwen3-VL weights with its type set to `minimax`. Because ComfyUI caches identical inputs, change the number in `RandomNoise` (`随机种子`) whenever you want a fresh variation from the same prompt.

The clip below started as a text-to-video generation; its opening frame was then extracted and fed into the image-to-video workflow. Output files land in `/srv/comfyui-h3/output/H3/` on the host.

<div>
<video
  controls
  playsinline
  preload="metadata"
  src="/videos/posts/2026/11/minimax-h3-v100-i2v.mp4"
  aria-label="Sailboat video generated on two V100s, 608 by 352 pixels, about five seconds"
  style="width: 100%; max-width: 608px"
></video>
</div>

## Passing the baton between two GPUs

Even with NVLink between the two V100s and `gpus: all` in Compose, putting single-GPU and dual-GPU timings side by side shows almost no difference on the stopwatch:

| Scenario                               | One GPU | Stages split across two GPUs |
| -------------------------------------- | ------- | ---------------------------- |
| First generation after service startup | 195.3 s | 196.5 s                      |
| Same prompt, new seed                  | 78.4 s  | 77.6 s                       |
| Models loaded, prompt changed          | 84.7 s  | 81.9 s                       |

Two 16GB cards do not automatically merge into a single 32GB pool inside the container. Prompt encoding, 8-step denoising, and audio-video decoding run one after another, and the heavy sampling loop still steps through a single card at roughly 8.3 seconds per step (a warm image-to-video pass takes about 91.9 seconds total).

What the second card changes is the breathing room in system memory.

When every node crowds onto one 16GB V100, the full set of weights cannot stay in VRAM at once. At each stage boundary, ComfyUI has to evict the previous model back to host RAM before loading the next one, squeezing free system memory down to 5–10GiB during sampling.

Splitting the stages parks the text encoder and both VAEs on physical GPU 0 while leaving physical GPU 1 dedicated to the 21GB H3 diffusion model. Without that back-and-forth shuffling between VRAM and RAM, free host memory stays at 18–24GiB throughout the run.

Watch out for one numbering flip: because `docker-compose.yml` sets `CUDA_VISIBLE_DEVICES: '1,0'`, ComfyUI's `gpu:0` maps to physical GPU 1, while `gpu:1` maps to physical GPU 0. Setting the three device-selector nodes on the left (`SelectCLIPDevice` and the two `SelectVAEDevice` nodes) to `gpu:1` places encoding and decoding on physical GPU 0; if you want to run on a single card, set all three back to `gpu:0`.

## Submitting jobs over HTTP

Beyond clicking Run on the canvas, external scripts can submit jobs through [ComfyUI's HTTP endpoints](https://github.com/Comfy-Org/ComfyUI/blob/v0.43.0/server.py).

Canvas JSON files include frontend layout metadata and cannot be sent directly as request bodies. Export the workflow in **API format** from the ComfyUI menu first (saved as `workflow-api.json`), wrap it in a `prompt` field, and post it to `POST /prompt`:

```bash
jq '{prompt: .}' workflow-api.json > request.json

curl --fail-with-body -sS http://127.0.0.1:8188/prompt \
  -H 'Content-Type: application/json' \
  --data-binary @request.json
```

Once `prompt_id` comes back, poll `GET /history/{prompt_id}` every few seconds (an empty object means the job is still queued or running, which you can check via `/queue`).

When `history[prompt_id].status.status_str` turns to `"success"`, read `filename`, `subfolder`, and `type` from `history[prompt_id].outputs["16"].images[0]` (node 16 is the `SaveVideo` node, and video outputs still use the `images` key) and pass them to `GET /view` to download the MP4. If the status reports `"error"`, the exception details sit in `status.messages`.

When a job stalls or VRAM runs tight, these commands show the state of the container and host resources:

```bash
cd /srv/comfyui-h3
docker compose ps
docker compose logs --tail 100
nvidia-smi
free -h
df -h /srv
```

Get that first five-second lake clip running smoothly, then nudge the canvas wider one step at a time.
