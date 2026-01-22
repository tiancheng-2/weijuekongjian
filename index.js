// pages/index/index.js
const app = getApp();

Page({
  data: {
    // 设置为空数组可以看到空状态
    // 设置为有数据可以看到列表
    restaurants: [
      {
        id: '1',
        name: '海底捞火锅',
        address: '朝阳区三里屯太古里',
        mustTryCount: 3,
        avoidCount: 1
      },
      {
        id: '2',
        name: '西贝莜面村',
        address: '海淀区中关村欧美汇',
        mustTryCount: 5,
        avoidCount: 0
      },
      {
        id: '3',
        name: '外婆家',
        address: '东城区王府井大街',
        mustTryCount: 2,
        avoidCount: 2
      },
      {
        id: '4',
        name: '小吊梨汤',
        address: '西城区什刹海',
        mustTryCount: 4,
        avoidCount: 1
      }
    ],
    theme: 'cyan',
    loading: true
  },

  onLoad() {
    this.setData({
      theme: app.globalData.theme
    });
  },

  onShow() {
    // 暂时不加载真实数据，使用假数据
  },

  // 跳转到新增餐厅页面
  goToAddRestaurant() {
    // 先用空页面
    wx.showToast({
      title: '新增餐厅页面开发中',
      icon: 'none'
    });
  },

  // 跳转到搜索页面
  goToSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  // 前往餐厅详情
  goToRestaurant(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showToast({
      title: `进入 ${name}`,
      icon: 'none'
    });
  },

  // 切换主题
  changeTheme(e) {
    const { theme } = e.currentTarget.dataset;
    this.setData({ theme });
    app.saveTheme(theme);

    const colors = {
      cyan: '#06B6D4',
      purple: '#A855F7',
      orange: '#F59E0B'
    };

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: colors[theme]
    });
  }
});
