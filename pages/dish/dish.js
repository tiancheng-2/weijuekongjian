// pages/dish/dish.js
const validator = require('../../utils/validator');

Page({
  data: {
    dishId: '',
    dishName: '',
    rating: 'must-try',
    photos: [],
    note: '',
    restaurantId: '',
    restaurantName: '',
    isEditing: false,
    // 编辑状态的数据
    editingName: '',
    editingRating: '',
    editingNote: ''
  },

  onLoad(options) {
    const { id, name, rating, photos, note, restaurantId, restaurantName } = options;
    
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

    // 处理照片
    let photoList = [];
    if (photos && photos !== 'undefined') {
      const photoUrl = decodeURIComponent(photos);
      if (photoUrl) {
        photoList = [photoUrl];
      }
    }

    this.setData({
      dishId: id,
      dishName: decodeURIComponent(name || ''),
      rating: rating || 'must-try',
      photos: photoList,
      note: note ? decodeURIComponent(note) : '',
      restaurantId: restaurantId || '',
      restaurantName: restaurantName ? decodeURIComponent(restaurantName) : ''
    });
  },

  // 查看照片
  viewPhoto(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.photos,
      current: this.data.photos[index]
    });
  },

  // 进入编辑模式
  onEdit() {
    this.setData({
      isEditing: true,
      editingName: this.data.dishName,
      editingRating: this.data.rating,
      editingNote: this.data.note
    });
  },

  // 编辑菜品名称（实时验证）
  onEditNameInput(e) {
    const value = validator.validateDishName(e.detail.value);
    this.setData({
      editingName: value
    });
  },

  // 编辑菜品笔记（实时验证）
  onEditNoteInput(e) {
    const value = validator.validateDishNote(e.detail.value);
    this.setData({
      editingNote: value
    });
  },

  // 选择编辑属性
  onEditRatingChange(e) {
    const { rating } = e.currentTarget.dataset;
    this.setData({
      editingRating: rating
    });
  },

  // 保存编辑
  onSave() {
    const { dishId, editingName, editingRating, editingNote, rating, restaurantId } = this.data;

    // 验证菜品名称
    if (validator.isEmpty(editingName)) {
      wx.showToast({
        title: '请输入菜品名称',
        icon: 'none'
      });
      return;
    }

    if (!validator.isLengthValid(editingName, 1, 20)) {
      wx.showToast({
        title: '菜品名称为1-20字',
        icon: 'none'
      });
      return;
    }

    // 验证菜品笔记（可选）
    if (editingNote && !validator.isEmpty(editingNote)) {
      if (!validator.isLengthValid(editingNote, 0, 50)) {
        wx.showToast({
          title: '菜品笔记不超过50字',
          icon: 'none'
        });
        return;
      }
    }

    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    const db = wx.cloud.database();
    const _ = db.command;

    // 更新菜品
    db.collection('dishes')
      .doc(dishId)
      .update({
        data: {
          dishName: editingName.trim(),
          rating: editingRating,
          note: editingNote.trim()
        }
      })
      .then(res => {
        // 如果属性改变了，需要更新餐厅统计
        if (rating !== editingRating) {
          const oldUpdate = rating === 'must-try' 
            ? { mustTryCount: _.inc(-1) }
            : { avoidCount: _.inc(-1) };
          const newUpdate = editingRating === 'must-try'
            ? { mustTryCount: _.inc(1) }
            : { avoidCount: _.inc(1) };

          return db.collection('restaurants')
            .doc(restaurantId)
            .update({
              data: {
                ...oldUpdate,
                ...newUpdate
              }
            });
        }
        return Promise.resolve();
      })
      .then(res => {
        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success',
          duration: 1000
        });

        // 保存成功后自动返回餐厅详情页
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('保存失败', err);
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
  },

  // 取消编辑
  onCancel() {
    this.setData({
      isEditing: false,
      editingName: '',
      editingRating: '',
      editingNote: ''
    });
  },

  // 删除菜品
  onDeleteDish() {
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这道菜吗？',
      confirmText: '删除',
      confirmColor: '#EF4444',
      success: res => {
        if (res.confirm) {
          this.performDelete();
        }
      }
    });
  },

  // 执行删除
  performDelete() {
    const { dishId, rating, restaurantId } = this.data;

    wx.showLoading({
      title: '删除中...',
      mask: true
    });

    const db = wx.cloud.database();
    const _ = db.command;

    // 删除菜品
    db.collection('dishes')
      .doc(dishId)
      .remove()
      .then(res => {
        // 更新餐厅统计
        const updateData = rating === 'must-try' 
          ? { mustTryCount: _.inc(-1) }
          : { avoidCount: _.inc(-1) };

        return db.collection('restaurants')
          .doc(restaurantId)
          .update({
            data: updateData
          });
      })
      .then(res => {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(err => {
        wx.hideLoading();
        console.error('删除失败', err);
        wx.showToast({
          title: '删除失败',
          icon: 'none'
        });
      });
  }
});
