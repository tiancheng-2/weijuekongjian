// services/restaurantService.js
// 餐厅和菜品相关的业务逻辑封装

const cloudDB = require('../utils/db');

/**
 * 餐厅服务类
 * 封装所有与餐厅和菜品相关的数据库操作
 */
class RestaurantService {
  constructor() {
    this.COLLECTIONS = {
      RESTAURANTS: 'restaurants',
      DISHES: 'dishes',
      USER_STATS: 'user_stats'
    };

    this.CLOUD_FUNCTIONS = {
      UPDATE_STATS: 'updateStats',
      RESTAURANT: 'restaurant',
      DISH: 'dish'
    };
  }

  // ==================== 统计数据 ====================

  /**
   * 获取首页统计数据
   * @returns {Promise<Object>} { totalRestaurants, totalDishes, mustTryCount, avoidCount }
   */
  async getHomeStats() {
    try {
      // 方案1: 从缓存集合获取（推荐，性能最优）
      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.UPDATE_STATS, {
        action: 'get'
      });

      return result || {
        totalRestaurants: 0,
        totalDishes: 0,
        mustTryCount: 0,
        avoidCount: 0
      };

      // 方案2: 实时聚合查询（备用方案，性能较差）
      // const [restaurantCount, dishCount, mustTryCount] = await Promise.all([
      //   cloudDB.collection(this.COLLECTIONS.RESTAURANTS).count(),
      //   cloudDB.collection(this.COLLECTIONS.DISHES).count(),
      //   cloudDB.collection(this.COLLECTIONS.DISHES).where({ rating: 'must-try' }).count()
      // ]);
      //
      // return {
      //   totalRestaurants: restaurantCount.total,
      //   totalDishes: dishCount.total,
      //   mustTryCount: mustTryCount.total,
      //   avoidCount: dishCount.total - mustTryCount.total
      // };
    } catch (error) {
      console.error('[RestaurantService] Get home stats failed:', error);
      throw error;
    }
  }

  // ==================== 餐厅相关 ====================

  /**
   * 获取餐厅列表（分页）
   * @param {Number} page - 页码（从0开始）
   * @param {Number} pageSize - 每页数量（默认20）
   * @param {String} keyword - 搜索关键词（可选）
   * @returns {Promise<Array>}
   */
  async getRestaurants(page = 0, pageSize = 20, keyword = '') {
    try {
      const _ = cloudDB.getCommand();
      let where = {};

      // 如果有搜索关键词，添加模糊查询
      if (keyword) {
        where = {
          name: cloudDB.getDB().RegExp({
            regexp: keyword,
            options: 'i'
          })
        };
      }

      // 调用云函数获取餐厅列表
      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.RESTAURANT, {
        action: 'list',
        params: {
          keyword: keyword,
          limit: pageSize,
          skip: page * pageSize
        }
      });

      return result.list || [];
    } catch (error) {
      console.error('[RestaurantService] Get restaurants failed:', error);
      throw error;
    }
  }

  /**
   * 获取餐厅详情
   * @param {String} id - 餐厅ID
   * @returns {Promise<Object>}
   */
  async getRestaurantDetail(id) {
    try {
      if (!id) {
        throw new Error('Restaurant ID is required');
      }

      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.RESTAURANT, {
        action: 'detail',
        params: { id }
      });

      return result;
    } catch (error) {
      console.error('[RestaurantService] Get restaurant detail failed:', error);
      throw error;
    }
  }

  /**
   * 创建餐厅
   * @param {Object} data - 餐厅数据
   * @param {String} data.name - 餐厅名称（必填，≤15字）
   * @param {String} data.address - 地址（可选，≤30字）
   * @param {Array<String>} data.tags - 标签（可选，最多5个）
   * @param {Object} data.location - 地理位置（可选）
   * @returns {Promise<String>} - 返回新餐厅ID
   */
  async createRestaurant(data) {
    try {
      // 数据验证
      this._validateRestaurantData(data);

      // 调用云函数创建餐厅
      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.RESTAURANT, {
        action: 'add',
        params: {
          name: data.name.trim(),
          address: data.address?.trim() || '',
          tags: data.tags || [],
          location: data.location || null,
          coverImage: data.coverImage || ''
        }
      });

      // 创建成功后，更新用户统计
      await this._updateUserStats();

      return result._id;
    } catch (error) {
      console.error('[RestaurantService] Create restaurant failed:', error);
      throw error;
    }
  }

  /**
   * 更新餐厅
   * @param {String} id - 餐厅ID
   * @param {Object} data - 更新的数据
   * @returns {Promise<Boolean>}
   */
  async updateRestaurant(id, data) {
    try {
      if (!id) {
        throw new Error('Restaurant ID is required');
      }

      // 调用云函数更新餐厅
      await cloudDB.callFunction(this.CLOUD_FUNCTIONS.RESTAURANT, {
        action: 'update',
        params: {
          id,
          ...data
        }
      });

      return true;
    } catch (error) {
      console.error('[RestaurantService] Update restaurant failed:', error);
      throw error;
    }
  }

  /**
   * 删除餐厅
   * @param {String} id - 餐厅ID
   * @returns {Promise<Boolean>}
   */
  async deleteRestaurant(id) {
    try {
      if (!id) {
        throw new Error('Restaurant ID is required');
      }

      // 调用云函数删除餐厅（会级联删除所有菜品）
      await cloudDB.callFunction(this.CLOUD_FUNCTIONS.RESTAURANT, {
        action: 'delete',
        params: { id }
      });

      // 删除成功后，更新用户统计
      await this._updateUserStats();

      return true;
    } catch (error) {
      console.error('[RestaurantService] Delete restaurant failed:', error);
      throw error;
    }
  }

  // ==================== 菜品相关 ====================

  /**
   * 获取餐厅的菜品列表
   * @param {String} restaurantId - 餐厅ID
   * @param {String} rating - 筛选评分（可选：'must-try' | 'avoid'）
   * @returns {Promise<Array>}
   */
  async getDishes(restaurantId, rating = '') {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.DISH, {
        action: 'list',
        params: {
          restaurantId,
          rating: rating || undefined
        }
      });

      return result.list || [];
    } catch (error) {
      console.error('[RestaurantService] Get dishes failed:', error);
      throw error;
    }
  }

  /**
   * 获取菜品详情
   * @param {String} id - 菜品ID
   * @returns {Promise<Object>}
   */
  async getDishDetail(id) {
    try {
      if (!id) {
        throw new Error('Dish ID is required');
      }

      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.DISH, {
        action: 'detail',
        params: { id }
      });

      return result;
    } catch (error) {
      console.error('[RestaurantService] Get dish detail failed:', error);
      throw error;
    }
  }

  /**
   * 创建菜品
   * @param {Object} data - 菜品数据
   * @param {String} data.restaurantId - 餐厅ID（必填）
   * @param {String} data.dishName - 菜品名称（必填，≤20字）
   * @param {String} data.rating - 评分（必填：'must-try' | 'avoid'）
   * @param {String} data.note - 笔记（可选，≤25字）
   * @param {Array<String>} data.tags - 标签（可选，最多5个）
   * @param {String} data.photoUrl - 照片云存储路径（可选）
   * @returns {Promise<String>} - 返回新菜品ID
   */
  async createDish(data) {
    try {
      // 数据验证
      this._validateDishData(data);

      // 调用云函数创建菜品
      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.DISH, {
        action: 'add',
        params: {
          restaurantId: data.restaurantId,
          dishName: data.dishName.trim(),
          rating: data.rating,
          note: data.note?.trim() || '',
          tags: data.tags || [],
          photoUrl: data.photoUrl || ''
        }
      });

      // 创建成功后，更新用户统计
      await this._updateUserStats();

      return result._id;
    } catch (error) {
      console.error('[RestaurantService] Create dish failed:', error);
      throw error;
    }
  }

  /**
   * 批量创建菜品
   * @param {String} restaurantId - 餐厅ID
   * @param {Array<Object>} dishes - 菜品数据数组
   * @returns {Promise<Number>} - 返回成功创建的数量
   */
  async batchCreateDishes(restaurantId, dishes) {
    try {
      if (!restaurantId) {
        throw new Error('Restaurant ID is required');
      }

      if (!Array.isArray(dishes) || dishes.length === 0) {
        throw new Error('Dishes array is required');
      }

      // 调用云函数批量创建
      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.DISH, {
        action: 'batchAdd',
        params: {
          restaurantId,
          dishes
        }
      });

      // 批量创建成功后，更新用户统计
      await this._updateUserStats();

      return result.added;
    } catch (error) {
      console.error('[RestaurantService] Batch create dishes failed:', error);
      throw error;
    }
  }

  /**
   * 更新菜品
   * @param {String} id - 菜品ID
   * @param {Object} data - 更新的数据
   * @returns {Promise<Boolean>}
   */
  async updateDish(id, data) {
    try {
      if (!id) {
        throw new Error('Dish ID is required');
      }

      // 调用云函数更新菜品
      await cloudDB.callFunction(this.CLOUD_FUNCTIONS.DISH, {
        action: 'update',
        params: {
          id,
          ...data
        }
      });

      // 如果修改了评分，需要更新统计
      if (data.rating) {
        await this._updateUserStats();
      }

      return true;
    } catch (error) {
      console.error('[RestaurantService] Update dish failed:', error);
      throw error;
    }
  }

  /**
   * 删除菜品
   * @param {String} id - 菜品ID
   * @returns {Promise<Boolean>}
   */
  async deleteDish(id) {
    try {
      if (!id) {
        throw new Error('Dish ID is required');
      }

      // 调用云函数删除菜品
      await cloudDB.callFunction(this.CLOUD_FUNCTIONS.DISH, {
        action: 'delete',
        params: { id }
      });

      // 删除成功后，更新用户统计
      await this._updateUserStats();

      return true;
    } catch (error) {
      console.error('[RestaurantService] Delete dish failed:', error);
      throw error;
    }
  }

  // ==================== 搜索功能 ====================

  /**
   * 搜索餐厅和菜品
   * @param {String} keyword - 搜索关键词
   * @returns {Promise<Object>} { restaurants: [], dishes: [] }
   */
  async search(keyword) {
    try {
      if (!keyword || keyword.trim().length === 0) {
        return {
          restaurants: [],
          dishes: []
        };
      }

      const trimmedKeyword = keyword.trim();

      // 并行搜索餐厅和菜品
      const [restaurants, dishes] = await Promise.all([
        this.getRestaurants(0, 10, trimmedKeyword),
        this._searchDishes(trimmedKeyword)
      ]);

      return {
        restaurants,
        dishes
      };
    } catch (error) {
      console.error('[RestaurantService] Search failed:', error);
      throw error;
    }
  }

  /**
   * 搜索菜品（内部方法）
   * @param {String} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async _searchDishes(keyword) {
    try {
      const result = await cloudDB.callFunction(this.CLOUD_FUNCTIONS.DISH, {
        action: 'list',
        params: {
          keyword,
          limit: 10
        }
      });

      return result.list || [];
    } catch (error) {
      console.error('[RestaurantService] Search dishes failed:', error);
      return [];
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 更新用户统计（调用云函数）
   * @private
   */
  async _updateUserStats() {
    try {
      await cloudDB.callFunction(this.CLOUD_FUNCTIONS.UPDATE_STATS, {
        action: 'update'
      });
    } catch (error) {
      // 统计更新失败不影响主流程，仅记录日志
      console.warn('[RestaurantService] Update stats failed:', error);
    }
  }

  /**
   * 验证餐厅数据
   * @param {Object} data
   * @private
   */
  _validateRestaurantData(data) {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('餐厅名称不能为空');
    }

    if (data.name.trim().length > 15) {
      throw new Error('餐厅名称不能超过15字');
    }

    if (data.address && data.address.trim().length > 30) {
      throw new Error('餐厅地址不能超过30字');
    }

    if (data.tags && data.tags.length > 5) {
      throw new Error('标签最多5个');
    }
  }

  /**
   * 验证菜品数据
   * @param {Object} data
   * @private
   */
  _validateDishData(data) {
    if (!data.restaurantId) {
      throw new Error('餐厅ID不能为空');
    }

    if (!data.dishName || data.dishName.trim().length === 0) {
      throw new Error('菜品名称不能为空');
    }

    if (data.dishName.trim().length > 20) {
      throw new Error('菜品名称不能超过20字');
    }

    if (!data.rating || !['must-try', 'avoid'].includes(data.rating)) {
      throw new Error('评分必须是 must-try 或 avoid');
    }

    if (data.note && data.note.trim().length > 25) {
      throw new Error('菜品笔记不能超过25字');
    }

    if (data.tags && data.tags.length > 5) {
      throw new Error('标签最多5个');
    }
  }
}

// 导出单例
const restaurantService = new RestaurantService();
module.exports = restaurantService;