// pages/add/index.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 餐厅名称
    name: '',
    
    // 标签（预设 + 选中状态）
    tags: [
      { label: 'Lunch', selected: false },
      { label: 'Dinner', selected: false },
      { label: 'Cafe', selected: false },
      { label: 'Date', selected: false },
      { label: 'Cheap', selected: false },
      { label: 'Fancy', selected: false }
    ],
    
    // 菜品列表（默认一个空菜品）
    dishes: [
      { name: '', isRecommended: false }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('[Add] Page loaded');
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log('[Add] Page show');
  },

  // ==================== Tag Interactions ====================

  /**
   * 切换标签选中状态
   */
  onToggleTag(e) {
    const { index } = e.currentTarget.dataset;
    const tags = this.data.tags;
    
    // 切换选中状态
    tags[index].selected = !tags[index].selected;
    
    this.setData({ tags });
    
    // 震动反馈
    wx.vibrateShort({
      type: 'light'
    });
    
    console.log('[Add] Toggle tag:', tags[index].label, tags[index].selected);
  },

  // ==================== Dish Interactions ====================

  /**
   * 添加新菜品
   */
  onAddDish() {
    const dishes = this.data.dishes;
    
    // 添加新的空菜品
    dishes.push({
      name: '',
      isRecommended: false
    });
    
    this.setData({ dishes });
    
    // 震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
    
    console.log('[Add] Add dish, total:', dishes.length);
    
    // 滚动到底部（可选）
    // wx.pageScrollTo({
    //   scrollTop: 9999,
    //   duration: 300
    // });
  },

  /**
   * 删除菜品
   */
  onDeleteDish(e) {
    const { index } = e.currentTarget.dataset;
    const dishes = this.data.dishes;
    
    // 确保至少保留一个菜品
    if (dishes.length <= 1) {
      wx.showToast({
        title: '至少保留一个菜品',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    // 删除指定索引的菜品
    dishes.splice(index, 1);
    
    this.setData({ dishes });
    
    // 震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
    
    console.log('[Add] Delete dish at index:', index, 'remaining:', dishes.length);
  },

  /**
   * 切换菜品推荐状态
   */
  onToggleRecommend(e) {
    const { index } = e.currentTarget.dataset;
    const { value } = e.detail;
    const dishes = this.data.dishes;
    
    dishes[index].isRecommended = value;
    
    this.setData({ dishes });
    
    console.log('[Add] Toggle recommend:', index, value);
  },

  // ==================== Save ====================

  /**
   * 保存数据
   */
  onSave() {
    const { name, tags, dishes } = this.data;
    
    // 验证餐厅名称
    if (!name || name.trim().length === 0) {
      wx.showToast({
        title: '请输入餐厅名称',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 提取选中的标签
    const selectedTags = tags
      .filter(tag => tag.selected)
      .map(tag => tag.label);
    
    // 过滤掉空菜品
    const validDishes = dishes.filter(dish => dish.name && dish.name.trim().length > 0);
    
    // 构建提交数据
    const submitData = {
      name: name.trim(),
      tags: selectedTags,
      dishes: validDishes.map(dish => ({
        name: dish.name.trim(),
        isRecommended: dish.isRecommended
      })),
      createTime: new Date().toISOString()
    };
    
    // 打印完整数据（模拟提交）
    console.log('==================== Submit Data ====================');
    console.log(JSON.stringify(submitData, null, 2));
    console.log('====================================================');
    
    // 震动反馈
    wx.vibrateShort({
      type: 'heavy'
    });
    
    // 显示成功提示
    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 1500
    });
    
    // 延迟返回上一页
    setTimeout(() => {
      wx.navigateBack({
        delta: 1
      });
    }, 1500);
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '添加餐厅 - 味觉空间',
      path: '/pages/add/index'
    };
  }
});