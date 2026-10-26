---
title: Google Play 下载卡在等待中
date: 2026-10-26
tags:
  - Google Play
  - 网络
  - DNS
  - ShellCrash
description: 记录 Google Play 下载排查，修正 CDN 分流与 DNS 后，应用能完成安装，部分更新仍在 98% 和 99% 长时间停顿。
outline: deep
aside: true
---

# Google Play 下载卡在等待中

<!-- DESC SEP -->

Google Play 能浏览，安装却一直等待。我沿着下载 CDN、DNS 与 QUIC 排查，逐步恢复安装。后续更新仍会在 98% 和 99% 停留超过一分钟，这篇记录本次配置与尚未查明之处。

<!-- DESC SEP -->

我用 Redmi Note 12 Turbo 通过 Wi-Fi 连接小米 BE5000。路由器运行 [ShellCrash](https://github.com/juewuy/ShellCrash)，内核为 Mihomo v1.19.17，使用 Hysteria2 连接美国 VPS。服务端通过 s-ui 提供 VLESS Reality、TUIC 和 Hysteria2 三个节点。

Google Play 可以浏览应用详情，点安装却一直转圈，显示“等待中”。我关掉 Wi-Fi，改用手机流量，通过 FlClash 连接同一台 VPS，三个节点都试过，仍然无法下载。

最初我怀疑节点异常。不过，这个对照还有一个缺口。FlClash 使用规则模式，三个节点也共用同一个公网 IP。换协议仍然失败，分流规则与出口路径仍需检查。

排查前，我看到一段 [LINUX DO 讨论](https://linux.do/t/topic/2627919/14)。其中一条建议是把 Google 规则提到国内规则之前，避免 `googleapis.cn`、`gstatic.cn` 等域名误走直连。

这条线索值得检查，但当前路由器已经把两个域名指向代理。继续增加 Google 代理规则，未必能碰到真正卡住那条连接。

## 找到安装时新增哪条连接

我先检查路由器与 VPS 配置，再在手机上尝试安装 Gemini，对照当时新增连接。

`play-fe.googleapis.com`、`play.googleapis.com` 都通过 Hysteria2 出站，有正常数据收发。安装开始后，手机又连接到下面几台主机。

```text
rr8---sn-ni57rn76.xn--ngstr-lra8j.com
rr7---sn-ni57rn76.xn--ngstr-lra8j.com
rr1---sn-ni57rn76.xn--ngstr-lra8j.com
```

这些连接同样走代理。配置中还有一条明确规则。

```yaml
- DOMAIN-SUFFIX,xn--ngstr-lra8j.com,🚀 节点选择
```

既然商店接口有响应，下载连接却卡住，我开始比较同一台 CDN 经不同路径访问时有何差异。下表记录两台实际下载主机，请求均使用 HTTPS 根路径。

| CDN 主机                                | BE5000 本地直连      | BE5000 经 Hysteria2 | 美国 VPS 直接访问 |
| --------------------------------------- | -------------------- | ------------------- | ----------------- |
| `rr7---sn-ni57rn76.xn--ngstr-lra8j.com` | 约 0.18 秒，HTTP 404 | 8 秒超时            | 8 秒超时          |
| `rr8---sn-ni57rn76.xn--ngstr-lra8j.com` | 约 0.18 秒，HTTP 404 | 8 秒超时            | 8 秒超时          |

这里 HTTP 404 只说明 TLS 握手完成，服务器能响应根路径请求，还不能证明 APK 可以下载。但直连与代理之间已经出现明确差异。

在路由器上，可以用下面两条命令比较路径。`7890` 是本机 Mihomo 混合代理端口，其他环境需要对应调整。

```bash
curl --noproxy '*' -4 -sS --max-time 8 \
  -o /dev/null \
  -w 'HTTP=%{http_code} IP=%{remote_ip} TLS=%{time_appconnect} TOTAL=%{time_total}\n' \
  'https://rr7---sn-ni57rn76.xn--ngstr-lra8j.com/'

curl -x http://127.0.0.1:7890 -sS --max-time 8 \
  -o /dev/null \
  -w 'HTTP=%{http_code} TLS=%{time_appconnect} TOTAL=%{time_total}\n' \
  'https://rr7---sn-ni57rn76.xn--ngstr-lra8j.com/'
```

另一次探测使用 Google 官方 Android 工具包下载地址。路由器直连后，请求重定向到 `*.gvt1-cn.com`，约 0.44 秒取得 65,536 字节，返回 HTTP 206。经美国 VPS 访问时，请求也重定向到这类 CDN，随后超时。这是工具包文件探测，与手机 APK 安装仍需分别验证。

于是，我先在规则前面加入两项。

```yaml
- DOMAIN-SUFFIX,xn--ngstr-lra8j.com,DIRECT
- DOMAIN-SUFFIX,gvt1-cn.com,DIRECT
```

策略直接写内置 `DIRECT`。检查面板时，名为“🎯 全球直连”那一组实际选中“🚀 节点选择”，最终仍走代理。组名不能代替实际出口。

两条规则热加载成功，根路径探测也恢复响应。回到手机取消安装、再次重试，界面依然显示“等待中”。

## 改成直连，还要检查解析地址

新一轮连接记录出现另一种域名。

```text
rr7---sn-ni57rn76.googlevideo.com
```

这个域名与前面 `xn--ngstr-lra8j.com` 主机解析到同一个 IPv4 地址 `203.208.33.86`。但域名不同，前两条规则无法匹配，原有 `DOMAIN-KEYWORD,google` 继续把它送往美国 VPS。

我为这组 CDN 补充精确直连规则。新连接确实命中 `DIRECT`，却仍然没有收到数据。

这次问题出在 DNS。

| 查询路径              | 同一域名返回结果                                        |
| --------------------- | ------------------------------------------------------- |
| 路由器本地 DNS        | `128.242.240.244`、`2a03:2880:f111:83:face:b00c:0:25de` |
| 经代理查询 Google DNS | `203.208.33.86`、`2401:3800:4002:2::16`                 |

指定后一组地址时，本地 IPv4、IPv6 均可完成 TLS 握手并取得 HTTP 响应。指定 IPv4 地址可以这样检查。

```bash
curl --noproxy '*' -4 -sS \
  --resolve 'rr7---sn-ni57rn76.googlevideo.com:443:203.208.33.86' \
  --max-time 6 -o /dev/null \
  -w 'HTTP=%{http_code} IP=%{remote_ip} TOTAL=%{time_total}\n' \
  'https://rr7---sn-ni57rn76.googlevideo.com/'
```

[`--resolve`](https://curl.se/docs/manpage.html#--resolve) 指定连接地址，同时保留 URL 主机名参与 TLS 校验。这个对照支持本地 DNS 返回结果受到污染，也说明改分流规则并未自动解决解析问题。

原配置把 `direct-nameserver` 指向 `127.0.0.1`，即路由器本地 DNS。根据 [Mihomo DNS 文档](https://wiki.metacubex.one/config/dns/#direct-nameserver-follow-policy)，直连出口默认不遵循 `nameserver-policy`。因此，即使常规 DNS 查询能返回正确地址，真正建立直连时仍可能重新走本地 DNS。

我把下面字段合并到现有 `dns` 段，保留其他 DNS 配置与原有策略条目。

```yaml
dns:
  direct-nameserver-follow-policy: true
  nameserver-policy:
    '+.googlevideo.com':
      - '8.8.8.8#🚀 节点选择'
```

`#🚀 节点选择` 指定 DNS 查询经该代理组转发；组名需要与当前配置一致。数据连接仍按路由规则走直连。这里分别控制查询路径与数据路径，不能把“代理查询 DNS”理解成“文件也经过代理”。[DNS 指定代理说明](https://wiki.metacubex.one/config/dns/)

这次修改后，手机终于开始下载 Gemini，进度推进到 4%，随后停住。

## 从 4% 继续追踪

连接记录显示，`sn-ni57rn76` 这组 CDN 通过 UDP 443 请求时，累计上传约 7,500 字节，下载仍为 0，很可能卡在 QUIC 连接尝试。此时 TCP 根路径探测约 0.14 秒就能取得响应。

我针对这组 CDN 加入 UDP 拒绝规则，促使客户端尝试回落到 TCP，再断开残留连接触发重试。这个调整依据当前 UDP 无响应与 TCP 可达之间差异，不能据此断言 Google Play 普遍需要禁用 QUIC。

下载进度随后到达 5%，再次卡住。我没有继续取消安装，而是保留现场，查看当前连接。

这次卡在 `rr3---sn-j5o76n7l.googlevideo.com`，仍经美国 VPS 出站。指定其解析地址 `58.63.233.68` 后，本地直连约 0.12 秒取得 HTTP 响应。我将这组 CDN 一并纳入精确直连匹配，热加载配置，再断开那条旧代理连接。

Gemini 最终安装成功。

到这一步，只能确认 Gemini 这次安装成功。同组 `rr2` 主机此前也出现过本地直连超时，其他应用能否稳定更新，还需要继续观察。

## 换个应用，又遇到等待

接着更新“纯纯写作”，Google Play 又显示“等待中”。它最终更新成功，随后 ChatGPT 也完成更新，但等待时间仍然很长。

这轮连接出现 `sn-j5o7dn7e` 等新 CDN 名称，超出之前两组名称匹配范围。其中两台主机本地直连约 0.12 秒取得响应，经美国 VPS 则在 TLS 阶段超时。逐个追加名称，显然还会遗漏。

我改用路由器现有中国大陆 IPv4、IPv6 地址表，给 `googlevideo.com` 增加目标地址条件。匹配大陆地址就走直连，同时拒绝这部分 UDP 请求，促使客户端尝试 TCP；其他目标继续沿用原有分流。

配置加载后，独立探测确认新 CDN 命中 `DIRECT`，约 0.11 秒取得 HTTP 响应。不过，纯纯写作与 ChatGPT 都在排查期间完成更新，不能仅凭完成时间判断这次调整是否加快下载。

## 保存规则与 DNS 配置

排查结束时，我保留下面四条前置规则，替代早先按 CDN 名称匹配那版配置。这份配置仍未解决全部停顿。

```yaml
- AND,((DOMAIN-SUFFIX,googlevideo.com),(NETWORK,UDP),(OR,((RULE-SET,google-play-cn-ipv4),(RULE-SET,google-play-cn-ipv6)))),REJECT
- AND,((DOMAIN-SUFFIX,googlevideo.com),(OR,((RULE-SET,google-play-cn-ipv4),(RULE-SET,google-play-cn-ipv6)))),DIRECT
- DOMAIN-SUFFIX,xn--ngstr-lra8j.com,DIRECT
- DOMAIN-SUFFIX,gvt1-cn.com,DIRECT
```

[Mihomo 按从上到下顺序匹配规则](https://wiki.metacubex.one/config/rules/#优先级)。这些条目需要放在 Google 通用代理规则之前，才能先捕获对应下载请求。

对应地址表通过文件规则集加载。下面配置放进 `/data/ShellCrash/yamls/others.yaml`，其中 `cn` 保留原先 DNS 配置使用那份域名规则集。

```yaml
rule-providers:
  cn:
    type: http
    behavior: domain
    format: mrs
    path: ./ruleset/cn.mrs
    url: https://testingcf.jsdelivr.net/gh/juewuy/ShellCrash@update/bin/geodata/mrs_geosite_cn.mrs
  google-play-cn-ipv4:
    type: file
    behavior: ipcidr
    format: text
    path: ./cn_ip.txt
  google-play-cn-ipv6:
    type: file
    behavior: ipcidr
    format: text
    path: ./cn_ipv6.txt
```

`cn_ip.txt` 与 `cn_ipv6.txt` 已存在于本机 `/data/ShellCrash`，本次复用现有文件，未另外下载地址库。[Mihomo 文件规则集](https://wiki.metacubex.one/config/rule-providers/)需要按文件内容指定 `behavior` 与 `format`，这里两份都是纯文本 CIDR 列表。

涉及目标 IP 匹配时，Mihomo 可能先查询 DNS，再判断地址是否命中规则集。因此，这套分流仍依赖解析结果与地址表，不能保证每次请求都一定匹配成功。[目标 IP 规则与 DNS 解析](https://wiki.metacubex.one/config/rules/#no-resolve)

本次使用三个持久化入口。

| 文件                                 | 本次保存内容                           |
| ------------------------------------ | -------------------------------------- |
| `/data/ShellCrash/yamls/rules.yaml`  | 上述四条前置规则                       |
| `/data/ShellCrash/yamls/user.yaml`   | 保留现有完整 `dns` 段，再合并 DNS 调整 |
| `/data/ShellCrash/yamls/others.yaml` | 保留 `cn`，增加两份本地 IP 规则集      |

`user.yaml` 需要保留完整 DNS 配置。前面代码块只展示两项改动，直接用它替换整个 DNS 段，会遗漏原有监听、Fake IP、上游 DNS 等字段。文件已有其他配置时，也应一起保留。

本机 ShellCrash 启动脚本会把自定义规则前置合并，并读取 `user.yaml` 与 `others.yaml`。因此，修改持久文件以后，需要重新生成运行配置，再检查或加载；直接重载旧运行文件不会自动合并新规则。通过 ShellCrash 重启服务可以触发这套流程。

这些入口依据本机脚本核对。其他订阅如果已经包含 `rule-providers`，需要先合并定义，避免生成重复顶层字段。

配置合并后，我先用 `CrashCore -t` 检查配置，再通过 API 热加载，并核对运行规则顺序。最后断开手机残留下载连接，让新请求重新匹配。

其他网络复用这套规则时，也需要查看当前 CDN 主机与实际路径。`googlevideo.com` 还承载其他请求，本次没有把整个域名统一改成直连。

## 手机流量需要单独迁移

路由器配置只覆盖经过 BE5000 处理那部分流量。关闭 Wi-Fi 后，FlClash 需要自行接管应用请求，再应用相应规则与 DNS 策略。

我还没有在手机流量环境验证这套配置。FlClash 0.8.97 支持订阅覆写脚本，但手机端还需要另外准备 IP 地址表，并保持规则模式，检查 Google Play、Google Play 服务与下载管理器是否进入 VPN 处理范围，以及最终 DNS 配置是否被客户端再次覆写。[0.8.97 配置处理逻辑](https://github.com/chen08209/FlClash/blob/v0.8.97/lib/common/task.dart)

路由器原先使用 `127.0.0.1` 作为直连 DNS，这个地址对应路由器本机服务。迁移到手机时，需要重新指定可用直连 DNS，不能把整段路由器配置原样复制过去。

## 安装完成以后，Gemini 仍报 1060

打开刚安装完成那份 Gemini，界面提示当前国家或地区不可用，错误码为 1060。这个问题需要另查。

连接记录确认，Gemini App 接口与网页版 `gemini.google.com` 都经 Hysteria2 访问美国 VPS，未命中前面下载直连规则。Cloudflare 将出口 IP 标记为美国，Google 账号关联地区也显示美国，但无痕窗口未登录时，发送消息仍然返回 1060。

[Google 官方将 1060 解释为地区可用性错误](https://support.google.com/gemini/answer/18647528?hl=en)。现有证据支持继续检查出口 IP 或它到 Google 之间路径，还不能断言 Google 全面封禁这个 IP，更不能用“美国机房”保证 Gemini 一定可用。

下一步需要换一个公网 IP，在相同浏览器与未登录状态下对照。VLESS、TUIC、Hysteria2 都在同一台 VPS 上，继续切换协议仍然共用出口，无法完成这项验证。

## 98% 和 99% 仍会停顿

后来更新 GitHub 和 Firefox，虽然最终成功，但进度曾卡在 98% 和 99% 超过一分钟，界面仍显示下载进度。我不能把这段等待直接解释成手机正在安装。

继续查看日志，有一条请求暴露另一个问题。`rr4---sn-j5o76n7e.googlevideo.com` 已命中 `DIRECT`，DNS 返回 `113.108.239.133`，连接这个地址 TCP 443 时仍然超时。对这条请求，分流已经生效，继续增加同类规则也无法让目标端口变得可达。

另一次独立文件探测约 1.28 秒取得 1 MiB 数据，返回 HTTP 206，只能说明当时那台 CDN 能传输文件。其他主机仍可能超时，不能据此认定整条下载链路都顺畅。

我又尝试更新“万豪旅享家”，这次也完成更新，但没能捕获末尾停顿现场。期间仍出现过一条经美国 VPS 出站下载连接，随后同域名直连探测可达，路径选择差异尚未查清。

所以，目前能确认几次安装与更新已经完成，部分 CDN 仍有连接异常。网络重试值得继续检查，但现有记录还无法把某条异常连接与 GitHub、Firefox 末尾停顿对应起来，也不能排除手机端处理因素。

我先保留当前配置，停在这里。下一次再遇到末尾停顿，需要同时留下连接字节变化与手机状态，才能继续判断。
