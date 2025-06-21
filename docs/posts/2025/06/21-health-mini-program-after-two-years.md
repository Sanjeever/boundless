---
title: 两年后又捣鼓了一个健康类小程序
date: 2025-06-21
tags:
  - 微信小程序
  - 微信支付
  - GraphQL
  - 重构
  - 心理健康
  - Vue Mini
---
# 两年后又捣鼓了一个健康类小程序

> ✨文章摘要（AI生成）

<!-- DESC SEP -->

笔者在两年后重新捣鼓了一个健康类小程序，这次是对两年前用uniapp做的粗糙版本进行了**全面重构**。由于个人非常认同这个小程序的价值——帮助用户全面了解真实的自己，加上iOS支付限制等原因，最终决定**完全免费**提供给大家使用。

这次重构从UI设计开始，前端使用**Vue Mini**全部重写，后端也进行了不少修改。技术栈上，后端保持Nest.js、GraphQL、Prisma的组合不变，前端则大换血采用Vue Mini，主要是看中了它能用Hook+响应式简化逻辑的特性，同时避免了uniapp的各种坑。

开发过程中实现了：
- **GraphQL请求封装**
- **JWT双token刷新+静默登录**
- **小程序分包优化**主包体积
- **微信支付集成**（虽然最后因为iOS限制被迫去掉）

最让人心累的是各种**审核流程**：域名备案、小程序备案、个体工商户申请、主体变更、微信支付申请、算法备案等等，走了一圈发现iOS不允许虚拟商品内购，最终只能免费提供服务。

尽管反响不大，但总算了却了一个心愿。这个小程序通过让朋友换位思考填写问卷，结合AI智能分析，帮助用户获得更全面的自我认知，笔者认为这对个人成长方向非常重要。

<!-- DESC SEP -->

## 始

熟悉我的老老...老朋友应该都知道，这个小程序其实是我两年前做的，当时是用uniapp做的，做得还比较简陋，页面比较粗糙，逻辑上只能用我的流程通过，不然就有BUG那种哈哈。

两年前的博客在这里：[两个多月捣鼓了一个健康类小程序](https://justin3go.com/posts/2023/05/07%E4%B8%A4%E4%B8%AA%E5%A4%9A%E6%9C%88%E6%8D%A3%E9%BC%93%E4%BA%86%E4%B8%80%E4%B8%AA%E5%81%A5%E5%BA%B7%E7%B1%BB%E5%B0%8F%E7%A8%8B%E5%BA%8F)

个人是非常认同这个小程序的价值的，确确实实希望它能够帮助到更多人全面了解真实的自己，基于此以及其他原因如支付接入iOS限制😓，所以这个小程序最终是完全免费的，如果你觉得其对你有帮助，希望能帮忙多多分享一下。

所以开始重构！这次从UI设计开始，前端用Vue Mini全部重新写了一遍，后端也修改了不少。

## 看

先展示一下最终成果：

> 也可以到我顺手写的一个落地页查看功能演示：[xin2.link](https://xin2.link)，里面也是视频演示及小程序码可以访问

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250621231103.png)

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250621231115.png)

## 忆

简单回忆一下这个小程序的背景：

无论是随时间出现的互联网、新冠疫情、短视频、网络社交媒体，还是长期以往存在的如高考、宿舍氛围、人际交往、就业压力等都无时无刻考验着青少年的心理健康，据相关研究表明，出现心理健康问题的青少年不在少数，并且一些心智成熟的成年人同样也面临着心理健康问题的煎熬。

心理健康问题危害极大，国家高度重视，出台了相关政策完善心理健康体系。

但目前的情况仍然有 3 个痛点。分别是普及难、发现难、解决难。而“互联网+心理健康系统”被多篇论文及文章指出是解决心理健康问题的重要途径之一。

- **痛点 1：如何普及心理健康教育，让每一位家长、老师、学生自己都重视起来**。当所有人都能正视并重视心理健康教育的时候，这个问题就能迎刃而解。目前普遍存在的问题就是父母家长教育水平偏低，不够重视心理健康教育，更加关注孩子的学业、就业情况，忽略其本身的发展。学校虽然响应国家政策，实施了一系列活动，如心理班会，心理测评、心理咨询等，但总归趣味性较低，学生参与感较少，积极度不高，即效果较差。让每一个人都重视心理健康教育是一条漫长的道路，需要坚持，不过我们仍然可以通过发现+解决的途径来加强心理健康教育，但由此又引入了痛点 2 和痛点 3 两个新的问题。
- **痛点 2：如何发现心理健康问题**。学生在填写相关心理调查问卷等时，填写时可能具有片面性和欺骗性。片面性是指由于学生本身缺少相关的心理专业知识，一些心理有问题的学生对于自身的真实情况了解程度也不高，误认为自己心理并没有任何问题；欺骗性本质上也是学生并不重视这方面的调查，认为填写它并不能帮助自己，或者以为自身最近出现的问题是暂时的，并且担心其他人知道自己“有病”，所以填写的结果也就敷衍了事，往好的方向填写。最终调查结果虽然令人满意，但学生的真实问题并没有被发现。
- **痛点 3：解决心理健康问题。优质心理健康咨询资源不足**，部分落后地区甚至根本无法享受到对应的心理健康咨询资源。心理咨询师通常需要较强的专业能力，丰富的阅历与人生经验，厚积而薄发，培养一个优秀的（能解决问题的）心理咨询师成本较高，即优秀的心理咨询师资源缺乏；并且在心理咨询过程中，**可能会出现线下尴尬的情况**，过度暴露隐私的情况。目前对于已经发现存在心理问题的学生，大多数是沟通能力并不突出，甚至并不愿意沟通交流，所以在对其进行心理辅导时，难以了解真实情况从而对症下药，整个心理辅导过程难以开展。

## 起

功能上，主要功能保持不变，去除了以前AI对话的功能，去除了几乎没啥用的主页等等一些冗余页面，做了一些减法，即减少工作量，又不至于过多页面拖垮用户的注意力。其次，除了以前的公式计算问卷结果之外，还增加了AI智能分析问卷结果并给出积极建议的小功能。

工程上，大致确定了一下，这次主要的模式是重构前端，后端基本框架不变，只是跟随前端需求进行变化，技术栈也有一定变化，可以看下一章节。

于是，我先使用 MasterGo 画了几个主要的页面（并非全部），之所以不画全部，一方面节约时间，另一方面其他页面也可以参考这几个主要页面来做，也无需每个页面都画出来，大致效果如下：

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250620093531.png)

最终效果也不是一比一还原，做的时候也有一定的微调。
## 栈

后端技术栈保持不变（甚至都没升级版本），还是Nest.js、GraphQL、Prisma（PostgreSQL）这一套，Nest.js和Prisma不必说，Node写后端的话的经典技术栈。

至于GraphQL，由于我的数据结构是【用户表->问卷用户多对多表->问卷表->题目表】这种结构，嵌套起来使用GraphQL来查询数据时就会特别方便。在重构过程中，很多时候连接口都不必重写，直接改改查询语句就能满足当前的查询需求了，这个在我重构过程中的一些查询变化时特别明显。

前端技术栈大换血，使用了Vue Conf 2024中提到的技术栈Vue Mini，其实如果没有这个技术栈，这次技术选型也多半会直接使用原生语法进行开发，不过既然出现了Vue Mini来增强了原生语法的逻辑层，使其可以使用Hook+响应式来简化重复逻辑及心智负担，那就拍板使用Vue Mini好了。

至于为什么不使用Uniapp：

- 一方面社区评价确实不好，很多坑，我怕...
- 又套了一层，创建了一个中间层来做Vue组件和小程序的同步，遇到问题排查时我是查微信小程序文档还是Uniapp文档呢，我菜啊～ 
- 其配套的一些UI组件库没看到喜欢的，而原生语法就有Vant和TDeisgn这两套较为优秀的组件库可以选择

组件库的选择，这个Vant和TDeisgn都可以，个人更偏向于TDesign的颜值。
## 做

这里简单描述一下前端基础设施搭建和一些不涉及业务部分的逻辑，后端基础设施的搭建可以参考这个[Nestjs开源模版](https://github.com/notiz-dev/nestjs-prisma-starter)，不过也有两年未更新了，框架的版本并不是最新的。
### GprahQL的封装

没找到比较靠谱的GraphQL请求库，所以就自己封装了一个请求类：

```ts
import { handleLogin } from './handleLogin';
import { BASE_URL } from '@/config';

// 定义GraphQL查询的响应类型
type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

// 定义wx.request的选项类型
type RequestOptions = WechatMiniprogram.RequestOption;

// 定义我们的GraphQL客户端选项
interface GraphQLClientOptions {
  url: string;
}

// 定义GraphQL变量的类型
export type Variables = Record<string, unknown>;
// Header
export type Header = Record<string, string>;

class GraphQLClient {
  private url: string;

  constructor(options: GraphQLClientOptions) {
    this.url = options.url;
  }

  async query<T>(query: string, variables?: Variables, header?: Header): Promise<T> {
    return this.request<T>({ query, variables }, header);
  }

  async mutate<T>(mutation: string, variables?: Variables, header?: Header): Promise<T> {
    return this.request<T>({ query: mutation, variables }, header);
  }

  private async request<T>(payload: { query: string; variables?: Variables; }, header: Header = {}): Promise<T> {
    await handleLogin(header);
    return new Promise((resolve, reject) => {
      const options: RequestOptions = {
        url: this.url,
        method: 'POST',
        data: payload,
        header: header,
        success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
          const response = res.data as GraphQLResponse<T>;
          if (response.errors && response.errors.length > 0) {
            reject(new Error(response.errors[0].message));
          } else if (response.data) {
            resolve(response.data);
          } else {
            reject(new Error('GraphQL response contains no data and no errors.'));
          }
        },
        fail: (err: WechatMiniprogram.GeneralCallbackResult) => {
          reject(new Error(`Network error: ${err.errMsg}`));
        }
      };

      wx.request(options);
    });
  }
}

export const graphQLClient = new GraphQLClient({
  url: BASE_URL
});
export default graphQLClient;

```

### JWT 双token刷新+静默登录

基本思路就是授权token -> 刷新token -> 登录；放在封装好的graphql请求函数里面。

- 如果有access token，判断它的exp字段是否过期，没有过期就直接请求
- 过期了就refresh token后再请求
- refresh token过期就执行登录请求
- 双token的好处，登录会额外调用一次外部接口，请求会更慢，所有尽量不使用登录接口

稍微需要注意的就是为了避免无限递归，需要做一个简单的标志，就是在refresh和login请求时，不执行这段逻辑，直接请求。

同时我这里增加了一个exp字段方便客户端直接判断token是否过期，而不是多请求一次服务器返回401才知道授权失败。

```ts
import { getExpireInPayload, getToken, setToken } from "@/utils/auth";
import { useUserInfo } from "@/hooks/useUserInfo";
import { login, refresh } from "./auth";
import { Header } from "./request";

let isSkip = false;

// 请求拦截器：实现JWT 双token刷新+静默登录
export const handleLogin = async (header: Header) => {
  if (isSkip) {
    return header;
  }

  const loginAndSetData = async () => {
    try {
      isSkip = true; // 避免递归栈溢出
      const { code } = await wx.login();
      const { accessToken, refreshToken, user } = (await login({ data: { code } }));
      // save token
      header.Authorization = `Bearer ${accessToken}`;
      setToken("accessToken", accessToken);
      setToken("refreshToken", refreshToken);
      // save userInfo
      const { setUserInfo } = useUserInfo();
      setUserInfo(user);
    } catch (error) {
      void wx.showToast({
        title: "登录失败，请检查网络并重试",
        icon: "none",
      });
      console.error('[APP ERROR] - 登录失败: ', error);
    } finally {
      isSkip = false;
    }
  }
  // 0. 获取用户信息, 如果没有用户信息则登录
  const { userInfo } = useUserInfo();
  if (!userInfo) {
    await loginAndSetData();
    return header;
  }

  const timestamp = Math.ceil(+new Date().getTime() / 1000); //获取当前的时间戳

  // 1. access部分
  const accessToken = getToken("accessToken"); // 获取身份验证令牌
  const expInAccessToken = getExpireInPayload(accessToken);
  // accessToken未过期，直接加入请求头请求
  if (timestamp < expInAccessToken) {
    header.Authorization = `Bearer ${accessToken}`;
    return header;
  }

  // 2. refresh部分
  const lastRefreshToken = getToken("refreshToken");
  const expInRefreshToken = getExpireInPayload(lastRefreshToken);
  // refreshToken未过期，刷新Token
  if (timestamp < expInRefreshToken) {
    try {
      isSkip = true; // 避免递归栈溢出
      const { accessToken, refreshToken } = (await refresh({ token: lastRefreshToken }));
      // save
      header.Authorization = `Bearer ${accessToken}`;
      setToken("accessToken", accessToken);
      setToken("refreshToken", refreshToken);
    } catch (error) {
      void wx.showToast({
        title: "登录失败，请检查网络并重试",
        icon: "none",
      });
      console.error('[APP ERROR] - 登录失败: ', error);
    } finally {
      isSkip = false;
    }
  } else {
    // 3. refreshToken过期，需要重新登录
    await loginAndSetData();
  }

  return header;
}

```

### 小程序分包减少主包体积

由于这个小程序依赖于echats以及一个拼音库，体积较大且不是在tab页使用的，所以分包很有必要。

这是我的分包设置：

```json
  "subPackages": [
    {
      "root": "analytics-package",
      "name": "analytics",
      "pages": [
        "pages/analytics/index"
      ]
    },
    {
      "root": "friend-package",
      "name": "friend",
      "pages": [
        "pages/friend-select/index"
      ]
    },
    {
      "root": "questionnaire-package",
      "name": "questionnaire",
      "pages": [
        "pages/questionnaire-fill/index",
        "pages/questionnaire-success/index",
        "pages/questionnaire-result/index"
      ]
    },
    {
      "root": "user-package",
      "name": "user",
      "pages": [
        "pages/update-profile/index",
        "pages/help-center/index"
      ]
    }
  ],
  "preloadRule": {
    "pages/questionnaire/index": {
      "network": "all",
      "packages": ["questionnaire", "analytics"]
    },
    "pages/mine/index": {
      "network": "all",
      "packages": ["user"]
    },
    "analytics-package/pages/analytics/index": {
      "network": "all",
      "packages": ["friend"]
    }
  },
```

很简单，其实只要告诉AI你的页面依赖情况，然后它就自动给你分好了，最后再叫AI全局搜索一下路径跳转，将相应路径修改为分包之后的路径即可。

### 微信支付的实现

#### 基本流程

参考：[小程序微信支付接入指引](https://pay.weixin.qq.com/static/applyment_guide/applyment_detail_miniapp.shtml)，[小程序支付API文档](https://pay.weixin.qq.com/doc/v3/merchant/4012791911)

不得不说对比起来Stripe的接入是真方便，微信支付首先没有NodeJS、Python等的官方SDK，所有的加密解密安全等与业务无关的代码还需要自己再写一遍，以及微信支付没有测试环境，所以测试时只能通过真实环境1分钱1分钱地测试...

这里引用一张官方的泳道图：

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250621181459.png)

不过目前仅通过自己的测试，由于iOS虚拟商品支付的限制，导致无法通过审核，并没有真正上线测试，所以下方代码仅供参考。
#### 后端实现

这是我的支付service：

```ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { CreatePaymentInput } from './dto/create-payment.input';
import { UpdatePaymentInput } from './dto/update-payment.input';
import { Payment } from './models/payment.models';
import {
  WechatPaymentResponse,
  WechatPayNotifyResult,
} from './dto/wechat-payment.dto';
import {
  PaymentStatus,
  PaymentType,
  PAYMENT_PRICES,
  WechatPayConfig,
} from './dto/payment-config';
import { v4 as uuidv4 } from 'uuid';
import { addMonths, addYears } from 'date-fns';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RoleEnum } from '../common/enums/role.enum';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private wechatConfig: WechatPayConfig;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private httpService: HttpService,
    private usersService: UsersService
  ) {
    // 初始化微信支付配置
    this.wechatConfig = {
      mchid: this.configService.get<string>('WECHAT_PAY_MCHID') || '',
      appid: this.configService.get<string>('WECHAT_PAY_APPID') || '',
      notifyUrl: this.configService.get<string>('WECHAT_PAY_NOTIFY_URL') || '',
      apiV3Key: this.configService.get<string>('WECHAT_PAY_API_V3_KEY') || '',
      serialNo: this.configService.get<string>('WECHAT_PAY_SERIAL_NO') || '',
      privateKey: Buffer.from(
        this.configService.get<string>('WECHAT_PAY_PRIVATE_KEY_BASE64') || '',
        'base64'
      ).toString('utf8'),
    };

    // 校验配置是否完整
    if (
      !this.wechatConfig.mchid ||
      !this.wechatConfig.appid ||
      !this.wechatConfig.notifyUrl
    ) {
      this.logger.warn('微信支付配置不完整，部分功能可能无法正常工作');
    }
  }

  /**
   * 创建支付订单
   */
  async create(
    userId: string,
    createPaymentInput: CreatePaymentInput
  ): Promise<Payment> {
    const { type } = createPaymentInput;

    // 获取支付金额配置
    const priceConfig = PAYMENT_PRICES.find((p) => p.type === type);
    if (!priceConfig) {
      throw new BadRequestException('无效的支付类型');
    }

    // 生成商户订单号
    const outTradeNo = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // 创建支付记录
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        type,
        outTradeNo,
        amount: priceConfig.amount,
        description: priceConfig.description,
        status: PaymentStatus.PENDING,
      },
    });

    return payment as Payment;
  }

  /**
   * 创建JSAPI支付参数
   */
  async createWechatPayment(
    userId: string,
    createPaymentInput: CreatePaymentInput,
    openid: string
  ): Promise<WechatPaymentResponse> {
    // 创建支付记录
    const payment = await this.create(userId, createPaymentInput);

    try {
      // 调用微信支付接口
      const result = await this.createWechatJsapiPay(payment, openid);
      return result;
    } catch (error) {
      // 如果微信支付下单失败，更新订单状态
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });

      this.logger.error(`微信支付下单失败: ${error.message}`, error.stack);
      throw new BadRequestException('支付下单失败，请稍后重试');
    }
  }

  /**
   * 调用微信JSAPI支付接口
   */
  private async createWechatJsapiPay(
    payment: Payment,
    openid: string
  ): Promise<WechatPaymentResponse> {
    // 构建微信支付请求数据
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = uuidv4().replace(/-/g, '');

    // 微信支付V3接口地址
    const url = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi';

    // 构建请求数据
    const requestData = {
      appid: this.wechatConfig.appid,
      mchid: this.wechatConfig.mchid,
      description: payment.description,
      out_trade_no: payment.outTradeNo,
      notify_url: this.wechatConfig.notifyUrl,
      amount: {
        total: payment.amount,
        currency: 'CNY',
      },
      payer: {
        openid: openid,
      },
    };

    // 计算请求签名
    const nonce = nonceStr;
    const method = 'POST';
    const body = JSON.stringify(requestData);

    // 构造签名字符串
    const message = `${method}\n${
      new URL(url).pathname
    }\n${timestamp}\n${nonce}\n${body}\n`;
    const signature = this.sign(message);

    // 构造Authorization头
    const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${this.wechatConfig.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${this.wechatConfig.serialNo}"`;

    try {
      // 发送请求到微信支付API
      const response = await firstValueFrom(
        this.httpService.post(url, requestData, {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authorization,
          },
        })
      );

      const prepay_id = response.data.prepay_id;

      // 生成小程序调起支付的参数
      const paymentParams = this.buildMiniProgramPayment(prepay_id);
      return paymentParams;
    } catch (error) {
      this.logger.error(`微信支付API调用失败: ${error.message}`, error.stack);
      throw new BadRequestException('支付请求失败，请稍后再试');
    }
  }

  /**
   * 生成小程序调起支付的参数
   */
  private buildMiniProgramPayment(prepayId: string): WechatPaymentResponse {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = uuidv4().replace(/-/g, '');
    const packageStr = `prepay_id=${prepayId}`;

    // 构造签名字符串
    const message = `${this.wechatConfig.appid}\n${timestamp}\n${nonceStr}\n${packageStr}\n`;
    const paySign = this.sign(message);

    return {
      appId: this.wechatConfig.appid,
      timeStamp: timestamp,
      nonceStr: nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign: paySign,
    };
  }

  /**
   * RSA签名
   */
  private sign(message: string): string {
    // 从私钥文件中读取私钥
    const privateKey = this.wechatConfig.privateKey;

    // 创建签名对象
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);

    // 签名并返回 Base64 编码结果
    return sign.sign(privateKey, 'base64');
  }

  /**
   * 处理微信支付回调通知
   */
  async handlePayNotify(
    headers: Record<string, string>,
    body: string | any
  ): Promise<{ code: string; message: string }> {
    try {
      // 解析通知数据 - 检查 body 是否已经是对象
      let notifyData: any;
      this.logger.log('body', body);
      if (typeof body === 'string') {
        notifyData = JSON.parse(body);
      } else {
        // body 已经是解析后的对象
        notifyData = body;
      }

      // 验证签名
      // 注：实际项目中，这里需要验证微信支付通知的签名，确保通知合法性
      // 由于涉及到证书和复杂的解密步骤，这里简化处理

      // 验证通知信息
      const resource = notifyData.resource;
      const ciphertext = resource.ciphertext;
      const nonce = resource.nonce;
      const associatedData = resource.associated_data || '';

      // 解密数据
      const decryptedData = this.decryptAes256Gcm(
        ciphertext,
        this.wechatConfig.apiV3Key,
        nonce,
        associatedData
      );

      const payResult = JSON.parse(decryptedData) as WechatPayNotifyResult;

      // 查找对应的支付订单
      const payment = await this.prisma.payment.findFirst({
        where: { outTradeNo: payResult.out_trade_no },
      });

      if (!payment) {
        this.logger.error(`支付回调：找不到订单 ${payResult.out_trade_no}`);
        return { code: 'FAIL', message: '订单不存在' };
      }

      // 判断支付状态
      if (payResult.trade_state === 'SUCCESS') {
        // 更新支付状态
        const user = await this.updatePaymentAndUser(payment.id, payResult);

        this.logger.log(
          `支付成功：用户 ${user.id} 支付订单 ${payment.outTradeNo}，金额 ${
            payResult.amount.total / 100
          } 元`
        );
        return { code: 'SUCCESS', message: 'OK' };
      } else {
        // 处理其他支付状态
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
          },
        });

        this.logger.warn(
          `支付未成功：订单 ${payment.outTradeNo}, 状态 ${payResult.trade_state}`
        );
        return { code: 'SUCCESS', message: 'OK' };
      }
    } catch (error) {
      this.logger.error(`处理支付回调出错: ${error.message}`, error.stack);
      return { code: 'FAIL', message: '回调处理失败' };
    }
  }

  /**
   * 更新支付记录和用户信息
   */
  private async updatePaymentAndUser(
    paymentId: string,
    payResult: WechatPayNotifyResult
  ) {
    // 使用事务确保数据一致性
    return await this.prisma.$transaction(async (tx) => {
      // 1. 更新支付记录
      const payment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(payResult.success_time),
        },
      });

	// 略一部分，更新用户表的VIP字段

      return updatedUser;
    });
  }

  /**
   * AES-256-GCM 解密
   */
  private decryptAes256Gcm(
    ciphertext: string,
    key: string,
    nonce: string,
    associatedData: string
  ): string {
    // 使用 base64 解码密文
    const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

    // 创建解密器
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(nonce, 'utf8')
    );

    // 设置关联数据
    decipher.setAAD(Buffer.from(associatedData, 'utf8'));

    // 假设密文的最后16字节是认证标签
    const authTagLength = 16;
    const authTag = ciphertextBuffer.slice(
      ciphertextBuffer.length - authTagLength
    );
    const actualCiphertext = ciphertextBuffer.slice(
      0,
      ciphertextBuffer.length - authTagLength
    );

    // 设置认证标签
    decipher.setAuthTag(authTag);

    // 解密
    let decrypted = decipher.update(actualCiphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * 查询所有支付记录
   */
  findAll() {
    return this.prisma.payment.findMany();
  }

  /**
   * 查询单个支付记录
   */
  findOne(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
    });
  }

  /**
   * 查询用户的支付记录
   */
  findByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 更新支付记录
   */
  update(id: string, updatePaymentInput: UpdatePaymentInput) {
    return this.prisma.payment.update({
      where: { id },
      data: updatePaymentInput,
    });
  }

  /**
   * 删除支付记录
   */
  remove(id: string) {
    return this.prisma.payment.delete({
      where: { id },
    });
  }
}

```

有两个主要的接口暴露出去：

- 一个是支付成功的回调接口，这个接口调用上述service的`handlePayNotify`进行处理即可；
- 还有一个是创建支付时的接口，这个接口调用上述service的`createWechatPayment`即可

#### 前端实现

这是前端支付创建流程：

```ts
  const handlePay = async (type: number, description: string) => {
    isPayLoading.value = true;
    try {
      const paymentData = await createWechatPayment({
        data: {
          type,
          description
        }
      });

      await new Promise<void>((resolve, reject) => {
        wx.requestPayment({
          appId: paymentData.appId,
          nonceStr: paymentData.nonceStr,
          package: paymentData.package,
          paySign: paymentData.paySign,
          signType: paymentData.signType as 'MD5' | 'HMAC-SHA256' | 'RSA',
          timeStamp: paymentData.timeStamp,
          success: async () => {
            showSuccess('支付成功');

            // 支付成功后刷新用户信息
            try {
              const latestUserInfo = await getUserInfo();
              setUserInfo(latestUserInfo);
            } catch (error) {
              console.error('刷新用户信息失败:', error);
            }

            resolve();
          },
          fail: (err) => {
            console.error('支付失败:', err);
            showError('支付失败');
            reject(new Error(err.errMsg || '支付失败'));
          }
        });
      });
    } catch (error) {
      console.error('创建支付订单失败:', error);
      showError('创建订单失败');
    } finally {
      isPayLoading.value = false;
    }
  };
```

就两步：

- 调用后端的创建订单接口返回一堆数据
- 然后通过这堆数据调用微信支付的拉取调用接口即可拉取微信支付
### 提交时小程序切换后台导致请求取消问题修复

这个是上线之后用户反馈的一个前端体验的问题。

背景是：由于问卷提交时，有较长的上下文发送给AI进行分析以及对应问卷的一个计算公式需要计算，所以在提交时花费时间较长。

这时候可能有一些用户就会切换小程序到后台，从而导致微信请求被取消，从而触发了保存失败的提示（实际后端已经执行成功了）

具体可以看微信小程序的这篇文章：[微信小程序的运行机制](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/operating-mechanism.html)

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250621202739.png)

即5秒之后如果接口没有请求完成，就会被切换到挂起状态从而在前端取消对应的请求，从而触发报错信息，以及留在提交页面，保存按钮也是可以继续触发的。所以我做了一个简单的判断，以保证用户的体验：

```ts
catch (error) {
      // 因为进入问卷页时就会检查更新权限，如果这里报错，说明挂起之后重新提交了，提示用户提交成功
      if (error instanceof Error && error.message === 'You can only update once per day') {
        // showWarning('24h内你已经提交过一次了');
        wx.nextTick(() => {
          void wx.reLaunch({
            url: '/pages/questionnaire/index',
            success: () => {
              showWarning('24h内你已经提交过一次了');
            }
          });
        })
      } else {
        showError('保存失败，请稍后重试');
        console.error('[APP ERROR] - 保存问卷填写结果失败: ', error);
      }
```

此时，如果用户提交后从后台返回该小程序，如果因为挂起状态导致请求取消，再次提交时，根据后端返回是否提交过的信息，判断返回首页并友好提示。

## 困

其实主要就是遇到了各种审核的问题，导致走一步，等一步，然后热情被浇灭了，又得过一阵才会鼓起劲再来做一部分，从而导致了这个小程序历经两年才重构完成。

来，我们来数一数：

1. 首先是域名的备案，因为小程序需要https接口，所以不能直接使用ip地址进行请求（当然本身不安全，所以需要域名，理解）
2. 然后自然而然需要经过腾讯云、工信局、本地公安的审核
3. 接下来微信小程序本身的备案（还要花钱，毕竟是外包给其他公司的，我们理解）
4. 备案过程中，打电话询问了小程序的情况，发现我有出售服务，所以被打回了，因为我是个人资质，不能出售商品
5. 好，接下来继续申请个体工商户，同样的，准备各种资料，被打回了两次终于审核成功拿到营业执照
6. 然后又提交一堆表单，打印了小程序主体变更书，然后提交审核将小程序的主体变更为了这个个体户
7. 再然后申请微信支付
8. 因为我需要用大模型来分析结果，所以又做了算法备案申请了小程序的深度合成类目
9. 写代码上线
10. 结果在提交了4-5个版本之后（前几个版本也是携带着微信支付的代码的），下一个版本审核失败，因为有虚拟商品的购买，iOS早在2020年左右就不允许微信小程序内购虚拟商品了
11. 没有办法，走过来一场空，又把微信支付相关代码全部去掉，最终加了点封面广告和提交等待时的弹窗广告以维持Token费用，最终免费给大家使用了

心累啊～

## 终

好在最终仅供多轮测试，成功上线，虽然反响不大，但总算了却了一个心愿，查了下git，最近1个月光是前端代码，就有近100次commit，感谢Vibe Coding啊～

后端不用多说，Vibe Coding时AI对于Nestjs的代码还是很熟悉的；而前端 Vibe coding 时只需告诉AI，逻辑层使用Vue3增强，视图层使用原生语法，效果就还不错～

整体还是非常推荐使用Vue Mini来进行开发小程序的，一个是拥有TS、Hook、响应式等现代化的写法，另外一个还是保留着原生小程序语法的生态，且没有额外封装一层导致的坑（复杂度）

接下来会继续小步完善该小程序的功能，比如排行榜功能等等...

最后，欢迎使用该小程序：[xin2.link](https://xin2.link)，里面也是视频演示及小程序码可以访问。

通过这个小程序，你可以让朋友换位思考在你的角度填写问卷，从而得到更加全面的自我了解（自我评价+他人评价），以及AI会给出智能分析及积极建议，让大家和朋友一起更加了解自己，了解自己究竟是什么样的一个人，我认为这对今后的成长方向是非常重要的。

谢谢大家看到了这么多碎碎念。