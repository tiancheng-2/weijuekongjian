// pages/search/search.js
Page({
  data: {
    searchKeyword: '',
    restaurantResults: [],
    dishResults: [],
    hasResults: false
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({
      searchKeyword: keyword
    });

    if (keyword) {
      this.performSearch(keyword);
    } else {
      this.setData({
        restaurantResults: [],
        dishResults: [],
        hasResults: false
      });
    }
  },

  // 执行搜索
  performSearch(keyword) {
    const db = wx.cloud.database();
    const _ = db.command;

    // 搜索餐厅（名称或地址）
    Promise.all([
      // 搜索餐厅名称
      db.collection('restaurants')
        .where({
          name: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
        .get(),
      // 搜索餐厅地址
      db.collection('restaurants')
        .where({
          address: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
        .get(),
      // 搜索菜品
      db.collection('dishes')
        .where({
          dishName: db.RegExp({
            regexp: keyword,
            options: 'i'
          })
        })
        .get()
    ])
    .then(results => {
      const [restaurantNameRes, restaurantAddressRes, dishRes] = results;

      // 合并餐厅结果（去重）
      const restaurantMap = {};
      
      // 添加按名称搜索到的餐厅
      restaurantNameRes.data.forEach(item => {
        restaurantMap[item._id] = {
          type: 'restaurant',
          id: item._id,
          name: item.name,
          address: item.address || ''
        };
      });
      
      // 添加按地址搜索到的餐厅
      restaurantAddressRes.data.forEach(item => {
        restaurantMap[item._id] = {
          type: 'restaurant',
          id: item._id,
          name: item.name,
          address: item.address || ''
        };
      });

      const restaurants = Object.values(restaurantMap);

      // 处理菜品结果（需要获取餐厅名称）
      const dishIds = dishRes.data.map(d => d.restaurantId);
      
      if (dishIds.length > 0) {
        // 获取餐厅信息
        return db.collection('restaurants')
          .where({
            _id: _.in(dishIds)
          })
          .get()
          .then(restaurantRes => {
            const restaurantNameMap = {};
            restaurantRes.data.forEach(r => {
              restaurantNameMap[r._id] = r.name;
            });

            const dishes = dishRes.data.map(item => ({
              type: 'dish',
              id: item._id,
              name: item.dishName,
              rating: item.rating,
              photoUrl: item.photoUrl || '',
              note: item.note || '',
              restaurantId: item.restaurantId,
              restaurantName: restaurantNameMap[item.restaurantId] || '未知餐厅'
            }));

            return { restaurants, dishes };
          });
      } else {
        return { restaurants, dishes: [] };
      }
    })
    .then(data => {
      this.setData({
        restaurantResults: data.restaurants,
        dishResults: data.dishes,
        hasResults: data.restaurants.length > 0 || data.dishes.length > 0
      });
    })
    .catch(err => {
      console.error('搜索失败', err);
      wx.showToast({
        title: '搜索失败',
        icon: 'none'
      });
    });
  },

  // 选择结果
  onSelectResult(e) {
    const { type, id, name, rating, photo, note, restaurantId, restaurantName } = e.currentTarget.dataset;

    if (type === 'restaurant') {
      // 跳转到餐厅详情页
      wx.navigateTo({
        url: `/pages/restaurant/restaurant?id=${id}&name=${encodeURIComponent(name)}`
      });
    } else if (type === 'dish') {
      // 跳转到菜品详情页
      wx.navigateTo({
        url: `/pages/dish/dish?id=${id}&name=${encodeURIComponent(name)}&rating=${rating}&photos=${encodeURIComponent(photo || '')}&note=${encodeURIComponent(note || '')}&restaurantId=${restaurantId}&restaurantName=${encodeURIComponent(restaurantName)}`
      });
    }
  }
});
