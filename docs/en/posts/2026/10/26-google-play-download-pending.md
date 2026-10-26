---
title: Google Play Downloads Stuck on Pending
date: 2026-10-26
tags:
  - Google Play
  - Networking
  - DNS
  - ShellCrash
description: Tracing Google Play downloads through CDN routing and DNS changes. Apps finish installing, but some updates still stall at 98% or 99%.
outline: deep
aside: true
---

# Google Play Downloads Stuck on Pending

<!-- DESC SEP -->

Google Play could browse apps but kept downloads pending. I traced the CDN connections, DNS resolution, and QUIC attempts, gradually getting installations to complete. Some updates still pause for more than a minute at 98% or 99%. This records the configuration I have kept and the questions that remain open.

<!-- DESC SEP -->

My Redmi Note 12 Turbo connects over Wi-Fi to a Xiaomi BE5000. The router runs [ShellCrash](https://github.com/juewuy/ShellCrash) with Mihomo v1.19.17 and uses Hysteria2 to reach a US VPS. On the server, s-ui provides three nodes using VLESS Reality, TUIC, and Hysteria2.

Google Play could display app details, but tapping Install left it spinning on “Pending.” I turned off Wi-Fi and tried mobile data, connecting to the same VPS through FlClash. None of the three nodes could get the download started.

I initially suspected a node problem. That comparison had a gap, though. FlClash was in rule mode, and all three nodes shared one public IP. Switching protocols did not rule out a routing problem or an issue with the exit path.

Before investigating, I had come across a [LINUX DO discussion](https://linux.do/t/topic/2627919/14). One suggestion was to move Google rules ahead of mainland China rules so that domains such as `googleapis.cn` and `gstatic.cn` would not mistakenly use a direct connection.

That was worth checking, but my router already sent both domains through the proxy. Adding more Google proxy rules might never touch the connection that was actually stuck.

## Find the connections that appear during installation

I checked the router and VPS configurations, then tried installing Gemini on the phone while watching the new connections.

Both `play-fe.googleapis.com` and `play.googleapis.com` went through Hysteria2 and exchanged data. Once installation was requested, the phone also connected to these hosts.

```text
rr8---sn-ni57rn76.xn--ngstr-lra8j.com
rr7---sn-ni57rn76.xn--ngstr-lra8j.com
rr1---sn-ni57rn76.xn--ngstr-lra8j.com
```

Those connections used the proxy too. The configuration explicitly contained this rule.

```yaml
- DOMAIN-SUFFIX,xn--ngstr-lra8j.com,🚀 节点选择
```

Since the store APIs responded while the download connections stalled, I compared the paths to the same CDN hosts. The requests below all used the HTTPS root path.

| CDN host                                | Direct from BE5000     | Through Hysteria2 from BE5000 | Direct from US VPS  |
| --------------------------------------- | ---------------------- | ----------------------------- | ------------------- |
| `rr7---sn-ni57rn76.xn--ngstr-lra8j.com` | About 0.18 s, HTTP 404 | Timed out after 8 s           | Timed out after 8 s |
| `rr8---sn-ni57rn76.xn--ngstr-lra8j.com` | About 0.18 s, HTTP 404 | Timed out after 8 s           | Timed out after 8 s |

HTTP 404 here only establishes that the TLS handshake completed and the server responded to a request for its root path. It does not prove that an APK can be downloaded. Still, there was a clear difference between the direct and proxy paths.

These commands compare the two paths from the router. Port `7890` is the local Mihomo mixed proxy port; it needs to match the configuration in use.

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

A separate probe used Google's official Android platform-tools download URL. From the router over a direct connection, it redirected to `*.gvt1-cn.com` and returned 65,536 bytes with HTTP 206 in about 0.44 seconds. Through the US VPS, it also redirected to this type of CDN, then timed out. This was a tool archive transfer, separate from the phone's APK installation.

I started by adding two rules at the front of the list.

```yaml
- DOMAIN-SUFFIX,xn--ngstr-lra8j.com,DIRECT
- DOMAIN-SUFFIX,gvt1-cn.com,DIRECT
```

I used the built-in `DIRECT` target. In the dashboard, the group named “🎯 全球直连” was actually set to “🚀 节点选择,” which sent traffic through the proxy. The group name did not describe its effective exit path.

Both rules loaded successfully, and the root-path probes started responding. I canceled the installation on the phone and tried again. Google Play still showed “Pending.”

## Direct traffic still needs the right DNS answer

The next connection sample included a different domain.

```text
rr7---sn-ni57rn76.googlevideo.com
```

It resolved to the same IPv4 address, `203.208.33.86`, as the earlier `xn--ngstr-lra8j.com` host. The hostname was different, though, so neither of the two new rules matched. The existing `DOMAIN-KEYWORD,google` rule continued sending it to the US VPS.

I added a direct rule for this particular CDN pattern. New connections now matched `DIRECT`, but still received no data.

This time, DNS was the problem.

| Query path                           | Answers for the same domain                             |
| ------------------------------------ | ------------------------------------------------------- |
| Router's local DNS                   | `128.242.240.244`, `2a03:2880:f111:83:face:b00c:0:25de` |
| Google DNS queried through the proxy | `203.208.33.86`, `2401:3800:4002:2::16`                 |

With the latter addresses specified explicitly, direct connections over both IPv4 and IPv6 completed TLS and received an HTTP response. The IPv4 test looked like this.

```bash
curl --noproxy '*' -4 -sS \
  --resolve 'rr7---sn-ni57rn76.googlevideo.com:443:203.208.33.86' \
  --max-time 6 -o /dev/null \
  -w 'HTTP=%{http_code} IP=%{remote_ip} TOTAL=%{time_total}\n' \
  'https://rr7---sn-ni57rn76.googlevideo.com/'
```

[`--resolve`](https://curl.se/docs/manpage.html#--resolve) sets the connection address while keeping the URL hostname for TLS verification. This comparison supported DNS poisoning on the local resolver path. Changing the routing rule had not automatically fixed name resolution.

The original configuration set `direct-nameserver` to `127.0.0.1`, the router's local DNS service. According to the [Mihomo DNS documentation](https://wiki.metacubex.one/config/dns/#direct-nameserver-follow-policy), direct outbound resolution does not follow `nameserver-policy` by default. A regular DNS query could therefore return the right address while the actual direct connection resolved the name again through local DNS.

I merged these fields into the existing `dns` section, retaining the other settings and policy entries.

```yaml
dns:
  direct-nameserver-follow-policy: true
  nameserver-policy:
    '+.googlevideo.com':
      - '8.8.8.8#🚀 节点选择'
```

The `#🚀 节点选择` suffix sends DNS queries through that proxy group, whose name must match the active configuration. The data connection still follows its routing rule and goes direct. The DNS query path and file transfer path are controlled separately. [Specifying a proxy for DNS](https://wiki.metacubex.one/config/dns/)

After this change, Gemini finally started downloading. It reached 4%, then stopped progressing.

## Following the download past 4%

Connections to the `sn-ni57rn76` CDN group over UDP port 443 showed about 7,500 bytes uploaded and zero downloaded, suggesting failed QUIC connection attempts. At the same time, a TCP root-path probe responded in about 0.14 seconds.

I added a UDP rejection rule for this CDN group to encourage the client to try TCP, then closed the remaining connections so it could retry. That adjustment followed the observed difference between an unresponsive UDP path and a reachable TCP path. It does not establish that Google Play generally requires QUIC to be disabled.

The progress then reached 5% and stalled again. I left the download running and inspected its connections rather than canceling it once more.

This time, `rr3---sn-j5o76n7l.googlevideo.com` was stuck on a connection through the US VPS. With its resolved address, `58.63.233.68`, specified explicitly, a direct request responded in about 0.12 seconds. I added this CDN pattern to the direct rule, reloaded the configuration, and closed the old proxy connection.

Gemini finished installing.

At that point, I could confirm only that this Gemini installation had succeeded. An earlier direct probe to an `rr2` host in the same group had also timed out. Whether other apps would update reliably still needed observation.

## Another app brings back the wait

Next, I updated 纯纯写作 (Pure Writer), and Google Play returned to “Pending.” That update eventually finished, as did a subsequent ChatGPT update, but the waits remained long.

The connections now included CDN names such as `sn-j5o7dn7e`, beyond the two patterns covered by the earlier rules. Two of those hosts responded directly in about 0.12 seconds but timed out during TLS when accessed through the US VPS. Adding names one at a time would keep leaving gaps.

I switched to the router's existing mainland China IPv4 and IPv6 address lists, adding a destination-address condition for `googlevideo.com`. The policy sends matching mainland destinations direct and rejects their UDP traffic to encourage a TCP retry. Other destinations retain the existing routing policy.

After loading the configuration, an independent probe confirmed that a new CDN matched `DIRECT` and returned an HTTP response in about 0.11 seconds. Pure Writer and ChatGPT both finished updating during the investigation, though, so their completion times alone could not establish whether this change made them faster.

## Keep the routing and DNS configuration

At the end of the investigation, I kept these four rules at the front of the list, replacing the earlier hostname-pattern rules. This configuration has not eliminated every stall.

```yaml
- AND,((DOMAIN-SUFFIX,googlevideo.com),(NETWORK,UDP),(OR,((RULE-SET,google-play-cn-ipv4),(RULE-SET,google-play-cn-ipv6)))),REJECT
- AND,((DOMAIN-SUFFIX,googlevideo.com),(OR,((RULE-SET,google-play-cn-ipv4),(RULE-SET,google-play-cn-ipv6)))),DIRECT
- DOMAIN-SUFFIX,xn--ngstr-lra8j.com,DIRECT
- DOMAIN-SUFFIX,gvt1-cn.com,DIRECT
```

[Mihomo evaluates rules from top to bottom](https://wiki.metacubex.one/config/rules/#优先级). These entries need to precede the general Google proxy rules to catch the corresponding download requests first.

The address lists are loaded as file-based rule providers. The following goes in `/data/ShellCrash/yamls/others.yaml`. The `cn` provider preserves the domain rule set already referenced by the DNS configuration.

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

Both `cn_ip.txt` and `cn_ipv6.txt` already existed under `/data/ShellCrash` on this router; I did not download another address database. For [Mihomo file-based rule providers](https://wiki.metacubex.one/config/rule-providers/), `behavior` and `format` must match the contents. Both files here contain plain-text CIDR lists.

When matching destination IPs, Mihomo may first resolve the hostname, then check the address against the rule provider. This policy still depends on DNS answers and the address lists; it does not guarantee a match for every request. [Destination IP rules and DNS resolution](https://wiki.metacubex.one/config/rules/#no-resolve)

I used three persistent configuration files.

| File                                 | Contents kept for this setup                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `/data/ShellCrash/yamls/rules.yaml`  | The four rules above, prepended to the existing list               |
| `/data/ShellCrash/yamls/user.yaml`   | The complete existing `dns` section with the DNS changes merged in |
| `/data/ShellCrash/yamls/others.yaml` | The existing `cn` provider plus the two local IP rule providers    |

The complete DNS configuration must remain in `user.yaml`. The earlier DNS snippet shows only two changes. Replacing the whole section with it would discard the existing listener, Fake IP settings, upstream resolvers, and other fields. Any other configuration already in the file must also be retained.

On this router, the ShellCrash startup script prepends custom rules and reads both `user.yaml` and `others.yaml`. Changes to these persistent files therefore need to be merged into the generated runtime configuration before it is checked or loaded. Reloading the old runtime file does not perform that merge. Restarting the service through ShellCrash can trigger the generation process.

I checked these entry points against the scripts installed on my router. A subscription that already contains `rule-providers` needs its definitions merged first to avoid duplicate top-level fields in the generated YAML.

After merging the configuration, I checked it with `CrashCore -t`, reloaded it through the API, and inspected the effective rule order. I then closed the phone's remaining download connections so new requests would be evaluated again.

Reusing these rules on another network still requires checking its current CDN hosts and actual paths. `googlevideo.com` serves other traffic too; I did not send the whole domain direct unconditionally.

## Mobile data needs a separate migration

The router configuration applies to traffic handled by the BE5000. With Wi-Fi off, FlClash has to capture the application traffic itself and apply the routing and DNS policies.

I have not tested this configuration over mobile data. FlClash 0.8.97 supports subscription override scripts, but the phone also needs suitable IP address lists. It needs to remain in rule mode, include Google Play, Google Play services, and Download Manager in the VPN scope, and preserve the intended DNS settings through the client's own overrides. [Configuration handling in 0.8.97](https://github.com/chen08209/FlClash/blob/v0.8.97/lib/common/task.dart)

The router used `127.0.0.1` for direct DNS because a local DNS service listened there. On the phone, that address refers to the phone itself. A usable direct resolver needs to be configured separately rather than copying the router's entire DNS section unchanged.

## Gemini still returns 1060 after installation

Opening the newly installed Gemini app produced a country-or-region availability message with error code 1060. That required a separate investigation.

The connection records confirmed that both the Gemini app's API and `gemini.google.com` used Hysteria2 through the US VPS. Neither matched the download-specific direct rules. Cloudflare identified the exit IP as US, and my Google Account's associated country also showed United States. Even in a private browser window without signing in, sending a message returned 1060.

[Google describes 1060 as a regional availability error](https://support.google.com/gemini/answer/18647528?hl=en). The evidence supports checking the exit IP or its path to Google next. It does not establish that Google has blocked the IP across its services, and a US datacenter location does not guarantee Gemini access.

The next comparison needs a different public IP, using the same browser and signed-out state. Switching among VLESS, TUIC, and Hysteria2 on the same VPS keeps the exit IP unchanged and cannot provide that comparison.

## Updates can still stall at 98% or 99%

Later, I updated GitHub and Firefox. Both eventually succeeded, but the downloads stalled at 98% and 99% for more than a minute. The UI still showed download progress, so I could not simply treat the wait as local installation work.

Further logs exposed another problem. `rr4---sn-j5o76n7e.googlevideo.com` matched `DIRECT`, DNS returned `113.108.239.133`, and connecting to TCP port 443 on that address still timed out. Routing was already taking effect for this request. Adding another equivalent rule would not make the destination port reachable.

A separate file probe returned 1 MiB with HTTP 206 in about 1.28 seconds. That established only that this particular CDN could transfer data at that moment. Other hosts could still time out, so it did not demonstrate that the whole download path was smooth.

I also tried updating 万豪旅享家 (Marriott Bonvoy). That update completed, but I did not capture a stall at the end. During the observation, one download connection still went through the US VPS, while a later direct probe to the same domain succeeded. The reason for that path-selection difference remains unclear.

For now, several installations and updates have completed, while some CDN connections still fail. Network retries remain worth investigating, but the available records do not connect a particular failed request to the GitHub or Firefox stall. They also do not rule out processing on the phone.

I am keeping the current configuration and stopping here for now. Another stall needs connection byte counts and the phone's state recorded at the same time before I can take the diagnosis further.
