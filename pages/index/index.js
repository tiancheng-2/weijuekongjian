// pages/index/index.js
Page({
  data: {
    restaurants: [],
    loading: true
  },

  onShow() {
    // 每次显示页面时加载餐厅列表
    this.loadRestaurants();
  },

  // 加载餐厅列表
  loadRestaurants() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });

    const db = wx.cloud.database();
    db.collection('restaurants')
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        wx.hideLoading();
        
        this.setData({
          restaurants: res.data,
          loading: false
        });
      })
      .catch(err => {
        wx.hideLoading();
        
        console.error('加载餐厅列表失败', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        
        this.setData({
          loading: false
        });
      });
  },

  // 跳转到新增餐厅页面
  goToAddRestaurant() {
    wx.navigateTo({
      url: '/pages/add-restaurant/add-restaurant'
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
    wx.navigateTo({
      url: `/pages/restaurant/restaurant?id=${id}&name=${encodeURIComponent(name)}`
    });
  }
});
