// utils/db.js
// 云数据库通用封装层 - 统一处理错误和Promise化

/**
 * 云数据库工具类
 * 负责初始化云环境、封装云函数调用、提供数据库实例
 */
class CloudDB {
  constructor() {
    this.db = null;
    this._ = null;
    this.initialized = false;
  }

  /**
   * 初始化云开发环境
   * @param {String} env - 云环境ID
   */
  init(env) {
    if (this.initialized) {
      console.warn('[CloudDB] Already initialized');
      return;
    }

    try {
      if (!wx.cloud) {
        throw new Error('请使用 2.2.3 或以上的基础库以使用云能力');
      }

      wx.cloud.init({
        env: env || 'cloud1-7gvrjj1p6b9df8ee', // 从 app.js 传入或使用默认值
        traceUser: true,
      });

      this.db = wx.cloud.database();
      this._ = this.db.command;
      this.initialized = true;

      console.log('[CloudDB] Initialized successfully');
    } catch (error) {
      console.error('[CloudDB] Init failed:', error);
      throw error;
    }
  }

  /**
   * 获取数据库实例
   * @returns {Database}
   */
  getDB() {
    if (!this.initialized) {
      throw new Error('[CloudDB] Not initialized. Call init() first.');
    }
    return this.db;
  }

  /**
   * 获取数据库命令对象（用于高级查询）
   * @returns {Command}
   */
  getCommand() {
    if (!this.initialized) {
      throw new Error('[CloudDB] Not initialized. Call init() first.');
    }
    return this._;
  }

  /**
   * 获取集合实例
   * @param {String} name - 集合名称
   * @returns {Collection}
   */
  collection(name) {
    if (!this.initialized) {
      throw new Error('[CloudDB] Not initialized. Call init() first.');
    }
    return this.db.collection(name);
  }

  /**
   * 调用云函数（Promise 封装 + 统一错误处理）
   * @param {String} name - 云函数名称
   * @param {Object} data - 传递给云函数的参数
   * @returns {Promise<Any>}
   */
  callFunction(name, data = {}) {
    return new Promise((resolve, reject) => {
      if (!this.initialized) {
        reject(new Error('[CloudDB] Not initialized'));
        return;
      }

      console.log(`[CloudDB] Calling function: ${name}`, data);

      wx.cloud.callFunction({
        name: name,
        data: data,
        success: (res) => {
          console.log(`[CloudDB] Function ${name} success:`, res);
          
          // 云函数返回格式统一为 { code, msg, data }
          if (res.result && res.result.code === 0) {
            resolve(res.result.data);
          } else {
            const errorMsg = res.result?.msg || '云函数调用失败';
            console.error(`[CloudDB] Function ${name} error:`, errorMsg);
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          console.error(`[CloudDB] Function ${name} failed:`, err);
          reject(err);
        }
      });
    });
  }

  /**
   * 批量查询（支持超过20条限制）
   * @param {String} collectionName - 集合名称
   * @param {Object} where - 查询条件
   * @param {Object} options - 查询选项 { orderBy, limit }
   * @returns {Promise<Array>}
   */
  async batchQuery(collectionName, where = {}, options = {}) {
    const { orderBy, limit = 100 } = options;
    const MAX_LIMIT = 20; // 单次查询上限
    const batchTimes = Math.ceil(limit / MAX_LIMIT);
    const tasks = [];

    for (let i = 0; i < batchTimes; i++) {
      let query = this.collection(collectionName).where(where);

      if (orderBy) {
        query = query.orderBy(orderBy.field, orderBy.order);
      }

      const promise = query
        .skip(i * MAX_LIMIT)
        .limit(MAX_LIMIT)
        .get();

      tasks.push(promise);
    }

    try {
      const results = await Promise.all(tasks);
      let data = [];
      
      results.forEach(result => {
        data = data.concat(result.data);
      });

      return data.slice(0, limit);
    } catch (error) {
      console.error('[CloudDB] Batch query failed:', error);
      throw error;
    }
  }

  /**
   * 上传文件到云存储
   * @param {String} cloudPath - 云存储路径
   * @param {String} filePath - 本地临时文件路径
   * @returns {Promise<String>} - 返回云存储文件ID
   */
  uploadFile(cloudPath, filePath) {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
        success: (res) => {
          console.log('[CloudDB] Upload file success:', res.fileID);
          resolve(res.fileID);
        },
        fail: (err) => {
          console.error('[CloudDB] Upload file failed:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 删除云存储文件
   * @param {Array<String>} fileIDs - 文件ID数组
   * @returns {Promise}
   */
  deleteFile(fileIDs) {
    return new Promise((resolve, reject) => {
      wx.cloud.deleteFile({
        fileList: fileIDs,
        success: (res) => {
          console.log('[CloudDB] Delete file success:', res);
          resolve(res);
        },
        fail: (err) => {
          console.error('[CloudDB] Delete file failed:', err);
          reject(err);
        }
      });
    });
  }
}

// 导出单例
const cloudDB = new CloudDB();
module.exports = cloudDB;
