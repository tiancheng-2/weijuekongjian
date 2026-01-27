// utils/validator.js - 输入验证工具

/**
 * 验证餐厅名称
 * 允许：中文、英文、数字、- · ()
 * 长度：1-15字
 */
function validateRestaurantName(value) {
  // 移除所有非法字符
  const cleaned = value.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\-·()（）]/g, '');
  // 限制长度
  return cleaned.substring(0, 15);
}

/**
 * 验证餐厅地址
 * 允许：中文、英文、数字、-#/号楼单元层室
 * 长度：2-30字
 */
function validateRestaurantAddress(value) {
  // 移除所有非法字符
  const cleaned = value.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\-#/号楼单元层室]/g, '');
  // 限制长度
  return cleaned.substring(0, 30);
}

/**
 * 验证菜品名称
 * 允许：中文、英文、数字、- · ()
 * 长度：1-20字
 */
function validateDishName(value) {
  // 移除所有非法字符
  const cleaned = value.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\-·()（）]/g, '');
  // 限制长度
  return cleaned.substring(0, 20);
}

/**
 * 验证菜品笔记
 * 允许：中文、英文、数字、常用标点、空格
 * 长度：0-50字
 */
function validateDishNote(value) {
  // 允许的标点：，。！？、；：""''（）【】…—
  const cleaned = value.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、；：""''（）【】…—,.!?;:()\[\]\-]/g, '');
  // 限制长度
  return cleaned.substring(0, 50);
}

/**
 * 检查是否为空或仅包含空格
 */
function isEmpty(value) {
  return !value || value.trim().length === 0;
}

/**
 * 检查长度是否在范围内
 */
function isLengthValid(value, min, max) {
  const length = value.trim().length;
  return length >= min && length <= max;
}

module.exports = {
  validateRestaurantName,
  validateRestaurantAddress,
  validateDishName,
  validateDishNote,
  isEmpty,
  isLengthValid
};
