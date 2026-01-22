// pages/map/index.js

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 地图中心坐标（默认北京）
    centerLongitude: 116.404,
    centerLatitude: 39.915,
    
    // 缩放级别
    scale: 12,
    
    // 标记点数组
    markers: [],
    
    // 餐厅数据
    restaurants: [],
    
    // 访问的城市数量（简化统计）
    visitedCities: 0,
    
    // 加载状态
    loading: true,
    
    // 地图上下文
    mapContext: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  async onLoad(options) {
    console.log('[Map] Page loaded')
    
    // 获取地图上下文
    this.mapContext = wx.createMapContext('restaurantMap', this)
    
    // 加载餐厅数据
    await this.loadRestaurants()
    
    // 获取用户当前位置（可选）
    this.getUserLocation()
  },

  /**
   * 加载餐厅数据
   * 核心逻辑：从数据库查询有地理位置的餐厅，转换为地图标记
   */
  async loadRestaurants() {
    try {
      this.setData({ loading: true })
      
      const db = wx.cloud.database()
      const _ = db.command
      
      // 查询所有包含 location 字段的餐厅
      // location 字段必须是 GeoPoint 类型
      const res = await db.collection('restaurants')
        .where({
          location: _.exists(true)  // 过滤：必须有位置信息
        })
        .field({
          _id: true,
          name: true,
          location: true,
          coverImage: true,
          tags: true
        })
        .limit(100)  // 最多100个标记点
        .get()
      
      console.log('[Map] Restaurants loaded:', res.data.length)
      
      const restaurants = res.data
      
      // 将餐厅数据转换为地图标记
      const markers = this.convertToMarkers(restaurants)
      
      // 计算访问的城市数量（简化：基于经纬度的粗略估算）
      const visitedCities = this.calculateVisitedCities(restaurants)
      
      // 计算地图中心点（所有餐厅的平均位置）
      const center = this.calculateCenter(restaurants)
      
      this.setData({
        restaurants,
        markers,
        visitedCities,
        centerLongitude: center.longitude,
        centerLatitude: center.latitude,
        loading: false
      })
      
      // 如果有餐厅，缩放地图以显示所有标记
      if (markers.length > 0) {
        this.fitAllMarkers()
      }
      
    } catch (error) {
      console.error('[Map] Load restaurants failed:', error)
      
      this.setData({ loading: false })
      
      wx.showToast({
        title: '加载失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 将餐厅数据转换为地图标记
   * @param {Array} restaurants - 餐厅数据数组
   * @returns {Array} markers - 地图标记数组
   */
  convertToMarkers(restaurants) {
    return restaurants.map((restaurant, index) => {
      // 从 GeoPoint 中提取经纬度
      const { longitude, latitude } = restaurant.location
      
      return {
        // 标记点唯一 ID
        id: index,
        
        // 经纬度
        longitude,
        latitude,
        
        // 标记点图标（使用默认红色大头针）
        iconPath: '/assets/marker-red.png',  // 可以自定义图标
        width: 40,
        height: 40,
        
        // 气泡（Callout）配置
        callout: {
          content: restaurant.name,          // 显示餐厅名称
          color: '#000000',                  // 文字颜色
          fontSize: 24,                      // 字体大小（rpx）
          borderRadius: 16,                  // 圆角
          bgColor: '#FFFFFF',                // 背景色
          padding: 12,                       // 内边距
          display: 'BYCLICK',                // 点击显示
          textAlign: 'center'                // 文字居中
        },
        
        // 自定义数据（用于点击事件）
        customData: {
          restaurantId: restaurant._id,
          restaurantName: restaurant.name
        }
      }
    })
  },

  /**
   * 计算地图中心点（所有餐厅的平均位置）
   * @param {Array} restaurants - 餐厅数据
   * @returns {Object} { longitude, latitude }
   */
  calculateCenter(restaurants) {
    if (restaurants.length === 0) {
      // 默认返回北京坐标
      return {
        longitude: 116.404,
        latitude: 39.915
      }
    }
    
    let totalLng = 0
    let totalLat = 0
    
    restaurants.forEach(restaurant => {
      totalLng += restaurant.location.longitude
      totalLat += restaurant.location.latitude
    })
    
    return {
      longitude: totalLng / restaurants.length,
      latitude: totalLat / restaurants.length
    }
  },

  /**
   * 计算访问的城市数量
   * 简化算法：根据经纬度范围粗略估算
   * @param {Array} restaurants - 餐厅数据
   * @returns {Number} 城市数量
   */
  calculateVisitedCities(restaurants) {
    if (restaurants.length === 0) return 0
    
    // 简化：每个经纬度1度范围算作一个城市
    const cityGrid = new Set()
    
    restaurants.forEach(restaurant => {
      const lng = Math.floor(restaurant.location.longitude)
      const lat = Math.floor(restaurant.location.latitude)
      cityGrid.add(`${lng},${lat}`)
    })
    
    return cityGrid.size
  },

  /**
   * 调整地图视野以显示所有标记
   */
  fitAllMarkers() {
    if (!this.mapContext || this.data.markers.length === 0) {
      return
    }
    
    // 使用 includePoints 方法包含所有标记点
    const points = this.data.markers.map(marker => ({
      longitude: marker.longitude,
      latitude: marker.latitude
    }))
    
    this.mapContext.includePoints({
      points,
      padding: [100, 100, 100, 100]  // 上右下左 padding
    })
  },

  /**
   * 获取用户当前位置
   */
  getUserLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('[Map] User location:', res)
        
        // 如果没有餐厅数据，使用用户位置作为中心点
        if (this.data.markers.length === 0) {
          this.setData({
            centerLongitude: res.longitude,
            centerLatitude: res.latitude
          })
        }
      },
      fail: (err) => {
        console.log('[Map] Get location failed:', err)
      }
    })
  },

  /**
   * 点击标记点
   */
  onMarkerTap(e) {
    const { markerId } = e.detail
    console.log('[Map] Marker tapped:', markerId)
    
    // 震动反馈
    wx.vibrateShort({ type: 'light' })
    
    // 获取标记点数据
    const marker = this.data.markers[markerId]
    
    if (marker && marker.customData) {
      // 跳转到餐厅详情页
      wx.navigateTo({
        url: `/pages/detail/index?id=${marker.customData.restaurantId}&name=${encodeURIComponent(marker.customData.restaurantName)}`
      })
    }
  },

  /**
   * 点击气泡
   */
  onCalloutTap(e) {
    const { markerId } = e.detail
    console.log('[Map] Callout tapped:', markerId)
    
    // 与点击标记点相同的处理
    this.onMarkerTap(e)
  },

  /**
   * 地图区域改变
   */
  onRegionChange(e) {
    // console.log('[Map] Region changed:', e)
    
    // 可以在这里处理地图移动、缩放后的逻辑
    // 例如：加载当前视野内的餐厅
  },

  /**
   * 放大地图
   */
  onZoomIn() {
    let scale = this.data.scale + 1
    
    if (scale > 18) scale = 18  // 最大缩放级别
    
    this.setData({ scale })
    
    wx.vibrateShort({ type: 'light' })
  },

  /**
   * 缩小地图
   */
  onZoomOut() {
    let scale = this.data.scale - 1
    
    if (scale < 5) scale = 5  // 最小缩放级别
    
    this.setData({ scale })
    
    wx.vibrateShort({ type: 'light' })
  },

  /**
   * 移动到当前位置
   */
  onMoveToCurrentLocation() {
    wx.vibrateShort({ type: 'medium' })
    
    if (!this.mapContext) return
    
    // 移动到用户当前位置
    this.mapContext.moveToLocation({
      success: () => {
        console.log('[Map] Moved to current location')
      },
      fail: (err) => {
        console.error('[Map] Move to location failed:', err)
        wx.showToast({
          title: '定位失败',
          icon: 'none',
          duration: 2000
        })
      }
    })
  },

  /**
   * 导航到添加餐厅页
   */
  onNavigateToAdd() {
    wx.vibrateShort({ type: 'medium' })
    
    wx.navigateTo({
      url: '/pages/add-restaurant/add-restaurant'
    })
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    console.log('[Map] Pull down refresh')
    
    await this.loadRestaurants()
    
    wx.stopPullDownRefresh()
    
    wx.showToast({
      title: '刷新成功',
      icon: 'success',
      duration: 1500
    })
  }
})