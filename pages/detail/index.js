// pages/detail/index.js

Page({
  /**
   * 页面的初始数据
   */
  data: {
    restaurantId: '',
    restaurant: {},
    dishes: [],
    mustTryCount: 0,
    avoidCount: 0,
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    const { id } = options
    
    console.log('[Detail] Page loaded with id:', id)
    
    if (!id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none',
        duration: 2000
      })
      setTimeout(() => wx.navigateBack(), 2000)
      return
    }
    
    this.setData({ restaurantId: id })
    
    // 加载数据
    await this.loadData(id)
  },

  /**
   * 加载餐厅和菜品数据
   */
  async loadData(restaurantId) {
    try {
      wx.showLoading({ title: '加载中...', mask: true })
      
      const db = wx.cloud.database()
      
      // 并发请求餐厅和菜品数据
      const [restaurantRes, dishesRes] = await Promise.all([
        db.collection('restaurants').doc(restaurantId).get(),
        db.collection('dishes')
          .where({ restaurantId })
          .orderBy('createTime', 'desc')
          .get()
      ])
      
      console.log('[Detail] Restaurant data:', restaurantRes.data)
      console.log('[Detail] Dishes data:', dishesRes.data)
      
      // 处理餐厅数据
      const restaurant = restaurantRes.data || {}
      
      // 计算价格等级
      if (!restaurant.priceLevel) {
        restaurant.priceLevel = this.calculatePriceLevel(dishesRes.data.length)
      }
      
      // 处理菜品数据
      const dishes = dishesRes.data || []
      
      // 统计必点和避坑数量
      const mustTryCount = dishes.filter(d => d.rating === 'must-try').length
      const avoidCount = dishes.filter(d => d.rating === 'avoid').length
      
      // 更新页面数据
      this.setData({
        restaurant,
        dishes,
        mustTryCount,
        avoidCount,
        loading: false
      })
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: restaurant.name || '餐厅详情'
      })
      
      wx.hideLoading()
      
    } catch (error) {
      wx.hideLoading()
      console.error('[Detail] Load data failed:', error)
      
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      })
      
      this.setData({ loading: false })
    }
  },

  /**
   * 计算价格等级
   */
  calculatePriceLevel(dishCount) {
    if (dishCount >= 10) return '$$$'
    if (dishCount >= 5) return '$$'
    return '$'
  },

  /**
   * 打开地图
   */
  onOpenMap() {
    const { restaurant } = this.data
    
    if (!restaurant.location) {
      wx.showToast({
        title: '暂无位置信息',
        icon: 'none',
        duration: 2000
      })
      return
    }
    
    const { latitude, longitude } = restaurant.location
    
    console.log('[Detail] Open map:', { latitude, longitude })
    
    wx.openLocation({
      latitude,
      longitude,
      name: restaurant.name,
      address: restaurant.address || '',
      scale: 18,
      success: () => {
        console.log('[Detail] Map opened successfully')
      },
      fail: (err) => {
        console.error('[Detail] Open map failed:', err)
        wx.showToast({
          title: '打开地图失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  /**
   * 点击菜品卡片
   */
  onDishTap(e) {
    const { id } = e.currentTarget.dataset
    
    console.log('[Detail] Dish tapped:', id)
    
    wx.vibrateShort({ type: 'light' })
    
    // 跳转到菜品详情页
    wx.navigateTo({
      url: `/pages/dish/index?id=${id}&restaurantId=${this.data.restaurantId}&restaurantName=${encodeURIComponent(this.data.restaurant.name)}`
    })
  },

  /**
   * 编辑餐厅
   */
  onEdit() {
    console.log('[Detail] Edit button tapped')
    
    wx.vibrateShort({ type: 'medium' })
    
    wx.showActionSheet({
      itemList: ['编辑餐厅信息', '删除餐厅'],
      itemColor: '#000000',
      success: (res) => {
        const tapIndex = res.tapIndex
        
        if (tapIndex === 0) {
          // 编辑餐厅信息
          console.log('[Detail] Edit restaurant info')
          wx.navigateTo({
            url: `/pages/edit-restaurant/index?id=${this.data.restaurantId}`
          })
        } else if (tapIndex === 1) {
          // 删除餐厅
          this.confirmDelete()
        }
      },
      fail: (err) => {
        console.log('[Detail] Action sheet cancelled')
      }
    })
  },

  /**
   * 确认删除餐厅
   */
  confirmDelete() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，餐厅及其所有菜品都将被删除',
      confirmText: '删除',
      confirmColor: '#FF3B30',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          await this.deleteRestaurant()
        }
      }
    })
  },

  /**
   * 删除餐厅
   */
  async deleteRestaurant() {
    try {
      wx.showLoading({ title: '删除中...', mask: true })
      
      const db = wx.cloud.database()
      const { restaurantId } = this.data
      
      // 1. 删除所有菜品
      await db.collection('dishes')
        .where({ restaurantId })
        .remove()
      
      // 2. 删除餐厅
      await db.collection('restaurants')
        .doc(restaurantId)
        .remove()
      
      wx.hideLoading()
      
      wx.showToast({
        title: '删除成功',
        icon: 'success',
        duration: 1500
      })
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      
    } catch (error) {
      wx.hideLoading()
      console.error('[Detail] Delete failed:', error)
      
      wx.showToast({
        title: '删除失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 添加菜品
   */
  onAddDish() {
    console.log('[Detail] Add dish button tapped')
    
    wx.vibrateShort({ type: 'medium' })
    
    wx.navigateTo({
      url: `/pages/add-dishes/index?restaurantId=${this.data.restaurantId}&restaurantName=${encodeURIComponent(this.data.restaurant.name)}`
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { restaurant, restaurantId, mustTryCount } = this.data
    
    console.log('[Detail] Share triggered')
    
    let shareTitle = `【味觉空间】${restaurant.name}`
    
    if (mustTryCount > 0) {
      shareTitle = `【味觉空间】${restaurant.name} - ${mustTryCount}道必点美食等你来尝！`
    }
    
    const sharePath = `/pages/detail/index?id=${restaurantId}&name=${encodeURIComponent(restaurant.name)}`
    
    const shareImage = restaurant.coverImage || '/assets/share-default.png'
    
    return {
      title: shareTitle,
      path: sharePath,
      imageUrl: shareImage,
      success: () => {
        console.log('[Detail] Share success')
        wx.showToast({
          title: '分享成功',
          icon: 'success',
          duration: 1500
        })
      }
    }
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    const { restaurant, restaurantId, mustTryCount } = this.data
    
    console.log('[Detail] Share to timeline')
    
    let shareTitle = `${restaurant.name}`
    
    if (mustTryCount > 0) {
      shareTitle = `${restaurant.name} - ${mustTryCount}道必点美食`
    }
    
    return {
      title: shareTitle,
      query: `id=${restaurantId}&name=${encodeURIComponent(restaurant.name)}`,
      imageUrl: restaurant.coverImage || '/assets/share-default.png'
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    console.log('[Detail] Pull down refresh')
    
    this.loadData(this.data.restaurantId).then(() => {
      wx.stopPullDownRefresh()
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      })
    })
  }
})