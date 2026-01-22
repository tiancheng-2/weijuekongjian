// app.js
const cloudDB = require('./utils/db');

App({
  onLaunch: function () {
    wx.cloud.init({
      env: "cloud1-7gvrjj1p6b9df8ee",
    });
  },
});
