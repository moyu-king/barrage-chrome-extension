# Barrage Chrome Extension

一个使用[vue3](https://cn.vuejs.org/)及[@crxjs/vite-plugin](https://github.com/crxjs/chrome-extension-tools)插件开发的chrome拓展程序。给予『无宗门背景的散修』游历于各大视频资源平台时弹幕支持。

插件提供两种版本，**本地版本**和**服务版本**，本地版本无需启动服务，安装插件即可使用，而服务版本需要启动弹幕服务（[仓库地址](https://github.com/moyu-king/barrage-service)），后续也会持续拓展在线弹幕等等功能。如果只是希望能看视频有弹幕，推荐使用本地版本。

#### 1. 安装：
[下载压缩包](https://github.com/moyu-king/barrage-chrome-extension/releases)，解压完后，在chrome的拓展程序界面点击**加载已解压的扩展程序**，并选中解压后的文件夹。（需请先勾选开发者模式）

#### 2. 使用
1. 添加视频
安装完插件后，是没有视频数据的（播放列表为空），需要自行前往目标网站的视频播放页面添加，比如 bilibili 的播放地址为 https://www.bilibili.com/bangumi/play/xxx。 来到对应的页面点击“+”图标，插件会先自动获取目标网站对应的信息，然后可以根据你的需求对名称进行修改，最后点击保存即可。

![添加视频](/images/add.png)
2. 播放弹幕
打开插件**视频列表**，选择对应的播放集数，然后根据需要，可先调好开始播放时间，然后点击播放按钮即可。
![播放弹幕](/images/barrage.png)

> 目前仅支持腾讯视频与bilibili，后续也会持续拓展，有建议欢迎反馈。
