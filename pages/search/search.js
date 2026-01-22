// pages/search/index.js

Page({
  /**
   * 页面的初始数据
   */
  data: {
    keyword: '',
    searchActive: false,
    searching: false,
    
    // 搜索历史（从本地存储读取）
    history: [],
    
    // 热门标签（Mock Data）
    hotTags: [
      { name: '甜品/下午茶', color: 'pink' },
      { name: '微醺/酒吧', color: 'blue' },
      { name: '川菜', color: 'green' },
      { name: '日料', color: 'wheat' },
      { name: '烧烤', color: 'yellow' },
      { name: '火锅', color: 'pink' },
      { name: '西餐', color: 'blue' },
      { name: '咖啡', color: 'wheat' }
    ],
    
    // 搜索结果
    results: [],
    
    // 防抖定时器
    searchTimer: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('[Search] Page loaded')
    
    // 加载搜索历史
    this.loadSearchHistory()
    
    // 如果有传入关键词，直接搜索
    if (options.keyword) {
      this.setData({
        keyword: options.keyword,
        searchActive: true
      })
      this.performSearch(options.keyword)
    }
  },

  /**
   * 加载搜索历史
   */
  loadSearchHistory() {
    try {
      const history = wx.getStorageSync('searchHistory') || []
      this.setData({ history })
    } catch (error) {
      console.error('[Search] Load history failed:', error)
    }
  },

  /**
   * 保存搜索历史
   */
  saveSearchHistory(keyword) {
    try {
      let history = this.data.history
      
      // 移除重复项
      history = history.filter(item => item !== keyword)
      
      // 添加到开头
      history.unshift(keyword)
      
      // 最多保留10条
      history = history.slice(0, 10)
      
      this.setData({ history })
      wx.setStorageSync('searchHistory', history)
    } catch (error) {
      console.error('[Search] Save history failed:', error)
    }
  },

  /**
   * 清空搜索历史
   */
  onClearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有搜索历史吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ history: [] })
          wx.removeStorageSync('searchHistory')
          wx.showToast({
            title: '已清空',
            icon: 'success',
            duration: 1500
          })
        }
      }
    })
  },

  /**
   * 删除单条历史记录
   */
  onDeleteHistory(e) {
    const { index } = e.currentTarget.dataset
    let history = this.data.history
    
    history.splice(index, 1)
    
    this.setData({ history })
    wx.setStorageSync('searchHistory', history)
    
    wx.vibrateShort({ type: 'light' })
  },

  /**
   * 点击历史记录
   */
  onHistoryTap(e) {
    const { keyword } = e.currentTarget.dataset
    
    this.setData({ keyword })
    this.performSearch(keyword)
    
    wx.vibrateShort({ type: 'light' })
  },

  /**
   * 点击热门标签
   */
  onTagTap(e) {
    const { keyword } = e.currentTarget.dataset
    
    this.setData({ keyword })
    this.performSearch(keyword)
    
    wx.vibrateShort({ type: 'medium' })
  },

  /**
   * 搜索框聚焦
   */
  onSearchFocus() {
    console.log('[Search] Input focused')
    this.setData({ searchActive: true })
  },

  /**
   * 搜索框失焦
   */
  onSearchBlur() {
    console.log('[Search] Input blurred')
    // 延迟隐藏，避免点击历史记录时立即隐藏
    setTimeout(() => {
      if (!this.data.keyword) {
        this.setData({ searchActive: false })
      }
    }, 200)
  },

  /**
   * 搜索输入（防抖）
   */
  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    
    // 清除之前的定时器
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }
    
    // 如果关键词为空，清空结果
    if (!keyword) {
      this.setData({
        results: [],
        searching: false
      })
      return
    }
    
    // 显示搜索中状态
    this.setData({ searching: true })
    
    // 防抖：500ms 后执行搜索
    const timer = setTimeout(() => {
      this.performSearch(keyword)
    }, 500)
    
    this.setData({ searchTimer: timer })
  },

  /**
   * 搜索确认
   */
  onSearchConfirm(e) {
    const keyword = e.detail.value.trim()
    
    if (keyword) {
      // 清除防抖定时器
      if (this.data.searchTimer) {
        clearTimeout(this.data.searchTimer)
      }
      
      this.performSearch(keyword)
    }
  },

  /**
   * 清除关键词
   */
  onClearKeyword() {
    this.setData({
      keyword: '',
      results: [],
      searchActive: true,
      searching: false
    })
    
    wx.vibrateShort({ type: 'light' })
  },

  /**
   * 执行搜索（核心函数）
   */
  async performSearch(keyword) {
    if (!keyword || keyword.trim().length === 0) {
      return
    }
    
    console.log('[Search] Performing search:', keyword)
    
    this.setData({ searching: true })
    
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 使用正则表达式进行模糊查询
      const regex = db.RegExp({
        regexp: keyword.trim(),
        options: 'i' // 不区分大小写
      })
      
      // 查询餐厅
      const restaurantRes = await db.collection('restaurants')
        .where({
          name: regex
        })
        .limit(20)
        .get()
      
      console.log('[Search] Restaurant results:', restaurantRes.data)
      
      // 处理结果：高亮匹配文字 + 计算价格等级
      const results = restaurantRes.data.map(item => {
        return {
          ...item,
          nameSegments: this.highlightText(item.name, keyword),
          priceLevel: this.calculatePriceLevel(item)
        }
      })
      
      this.setData({
        results,
        searching: false
      })
      
      // 保存搜索历史
      if (results.length > 0) {
        this.saveSearchHistory(keyword)
      }
      
    } catch (error) {
      console.error('[Search] Search failed:', error)
      
      wx.showToast({
        title: '搜索失败',
        icon: 'none',
        duration: 2000
      })
      
      this.setData({ searching: false })
    }
  },

  /**
   * 高亮匹配文字（辅助函数）
   * @param {String} text - 原始文本
   * @param {String} keyword - 关键词
   * @returns {Array} 分段数组，每段包含 { text, highlight }
   */
  highlightText(text, keyword) {
    if (!text || !keyword) {
      return [{ text, highlight: false }]
    }
    
    const segments = []
    const lowerText = text.toLowerCase()
    const lowerKeyword = keyword.toLowerCase()
    
    let lastIndex = 0
    let index = lowerText.indexOf(lowerKeyword)
    
    while (index !== -1) {
      // 添加匹配前的普通文本
      if (index > lastIndex) {
        segments.push({
          text: text.substring(lastIndex, index),
          highlight: false
        })
      }
      
      // 添加匹配的高亮文本
      segments.push({
        text: text.substring(index, index + keyword.length),
        highlight: true
      })
      
      lastIndex = index + keyword.length
      index = lowerText.indexOf(lowerKeyword, lastIndex)
    }
    
    // 添加剩余的普通文本
    if (lastIndex < text.length) {
      segments.push({
        text: text.substring(lastIndex),
        highlight: false
      })
    }
    
    return segments
  },

  /**
   * 计算价格等级
   */
  calculatePriceLevel(restaurant) {
    const { mustTryCount = 0, avoidCount = 0 } = restaurant
    const total = mustTryCount + avoidCount
    
    if (total >= 10) return '$$$'
    if (total >= 5) return '$$'
    return '$'
  },

  /**
   * 点击搜索结果
   */
  onResultTap(e) {
    const { id } = e.currentTarget.dataset
    
    console.log('[Search] Result tapped:', id)
    
    wx.vibrateShort({ type: 'light' })
    
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    })
  },

  /**
   * 页面卸载时清除定时器
   */
  onUnload() {
    if (this.data.searchTimer) {
      clearTimeout(this.data.searchTimer)
    }
  }
})