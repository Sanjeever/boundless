<template>
	<t-card :style="{ maxWidth: '520px', margin: 'auto', marginTop: '20px', paddingBottom: '10px' }">
		<h3 align="center" style="border: 0; margin: 10px 0 0;">Support Me</h3>
		<div class="card-container">
			<t-card theme="poster2" :class="'payment-card'">
				<template #cover>
					<div class="img-container">
						<img :src="weiXinPayUrl" alt="WeChat Pay QR Code" />
					</div>
				</template>
				<template #footer>
					<div align="center">
						{{ isEN ? "WeChat Pay" : "微信支付" }}
					</div></template
				>
			</t-card>
			<t-card theme="poster2" :class="'payment-card'">
				<template #cover>
					<div class="img-container">
						<img :src="zhiFuBaoPayUrl" alt="Alipay QR Code" />
					</div>
				</template>
				<template #footer>
					<div align="center">{{ isEN ? "Alipay" : "支付宝支付" }}</div>
				</template>
			</t-card>
		</div>
		<t-button theme="primary" block @click="handleClickKoFi">{{
			isEN ? "Buy Me a Coffee" : "给我买一杯咖啡"
		}}</t-button>
		<t-button
			href="mailto:just@justin3go.com"
			theme="primary"
			class="mt-10 no-underline"
			style="text-decoration: none;"
			block
			variant="outline"
			>{{ isEN ? "Any Positive Feedback" : "任何正向的反馈" }}</t-button
		>
	</t-card>
	<div class="support-me hollow-text source-han-serif">Support Me</div>
	<div class="my-name hollow-text source-han-serif">I'm Justin3go</div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vitepress";

const route = useRoute();
const isEN = computed(() => route.path.startsWith("/en"));

const weiXinPayUrl = "https://oss.justin3go.com/blogs/justin3go_weixin_pay.jpg";
const zhiFuBaoPayUrl =
	"https://oss.justin3go.com/blogs/justin3go_zhifubao_pay.jpg";
const koFiUrl = "https://ko-fi.com/V7V6YU3UT";

const handleClickKoFi = () => {
	window.open(koFiUrl, "_blank");
};
</script>
<style lang="scss" scoped>
.card-container {
	display: flex;
	justify-content: space-between;
	margin: 25px 0 20px;
	flex-wrap: wrap;
	gap: 20px;
}

.payment-card {
	width: 200px;
	flex-grow: 1;
	min-width: 150px;
}

.img-container {
	height: 198px;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: white;
	border-radius: 6px;
}

.img-container img {
	max-width: 100%;
	max-height: 100%;
	object-fit: contain;
}

.support-me {
	position: fixed;
	margin: 0 auto;
	left: 0;
	right: 0;
	top: 100px;
	width: 680px;

	z-index: -1;
	opacity: 0.12;
	font-size: 120px;
	font-weight: 900;
}

.my-name {
	position: fixed;
	margin: 0 auto;
	left: 0;
	right: 0;
	bottom: 30px;
	width: 770px;

	z-index: -1;
	opacity: 0.12;
	font-size: 120px;
	font-weight: 900;
}

.mt-10 {
	margin-top: 10px;
}

.no-underline {
	&:hover {
		text-decoration: none !important;
	}
}

.hollow-text {
	/* 设置文本颜色为透明 */
	color: var(--vp-c-bg);

	-webkit-text-stroke: 1px var(--vp-c-text-1);
}
</style>
