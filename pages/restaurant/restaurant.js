// pages/restaurant/restaurant.js
Page({
  data: {
    restaurantId: '',
    restaurantName: '',
    restaurantAddress: '',
    currentFilter: 'all',
    mustTryDishes: [],
    avoidDishes: []
  },

  onLoad(options) {
    const id = options.id || '';
    const name = decodeURIComponent(options.name || '');

    if (!id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      restaurantId: id,
      restaurantName: name
    });

    // 加载餐厅详情
    this.loadRestaurantDetail();
    // 加载菜品列表
    this.loadDishes();
  },

  // 加载餐厅详情
  loadRestaurantDetail() {
    const db = wx.cloud.database();
    db.collection('restaurants')
      .doc(this.data.restaurantId)
      .get()
      .then(res => {
        this.setData({
          restaurantAddress: res.data.address || ''
        });
      })
      .catch(err => {
        console.error('加载餐厅详情失败', err);
      });
  },

  // 加载菜品列表
  loadDishes() {
    const db = wx.cloud.database();
    db.collection('dishes')
      .where({
        restaurantId: this.data.restaurantId
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        // 按评分分类
        const mustTry = res.data.filter(dish => dish.rating === 'must-try');
        const avoid = res.data.filter(dish => dish.rating === 'avoid');

        this.setData({
          mustTryDishes: mustTry,
          avoidDishes: avoid
        });
      })
      .catch(err => {
        console.error('加载菜品失败', err);
      });
  },

  // 跳转到新增菜品页面
  goToAddDishes() {
    const { restaurantId, restaurantName } = this.data;
    wx.navigateTo({
      url: `/pages/add-dishes/add-dishes?restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurantName)}`
    });
  },

  // 筛选切换
  onFilterChange(e) {
    const { filter } = e.currentTarget.dataset;
    this.setData({
      currentFilter: filter
    });
  },

  // 查看菜品详情
  onViewDish(e) {
    const { id, name, rating, photo, note } = e.currentTarget.dataset;
    const { restaurantId, restaurantName } = this.data;
    
    wx.navigateTo({
      url: `/pages/dish/dish?id=${id}&name=${encodeURIComponent(name)}&rating=${rating}&photos=${encodeURIComponent(photo || '')}&note=${encodeURIComponent(note || '')}&restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurantName)}`
    });
  },

  // 编辑餐厅
  onEditRestaurant() {
    const { restaurantId, restaurantName, restaurantAddress } = this.data;
    wx.navigateTo({
      url: `/pages/edit-restaurant/edit-restaurant?id=${restaurantId}&name=${encodeURIComponent(restaurantName)}&address=${encodeURIComponent(restaurantAddress)}`
    });
  },

  onShow() {
    // 从其他页面返回时重新加载
    if (this.data.restaurantId) {
      this.loadDishes();
    }
  }
});
