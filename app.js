// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-7gvrjj1p6b9df8ee',
        traceUser: true,
      });
    }

    console.log('味觉空间启动 - 云开发模式');
  },

  globalData: {}
});
