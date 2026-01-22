// cloudfunctions/updateStats/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { action = 'update' } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  console.log('[UpdateStats] Called:', { action, openid })
  
  try {
    switch (action) {
      case 'get':
        return await getUserStats(openid)
      case 'update':
        return await updateUserStats(openid)
      default:
        return { code: 400, msg: '未知操作', data: null }
    }
  } catch (error) {
    console.error('[UpdateStats] Error:', error)
    return { code: 500, msg: error.message, data: null }
  }
}

async function getUserStats(openid) {
  try {
    const result = await db.collection('user_stats').doc(openid).get()
    
    if (result.data) {
      return {
        code: 0,
        msg: '获取成功',
        data: result.data
      }
    } else {
      await updateUserStats(openid)
      return await getUserStats(openid)
    }
  } catch (error) {
    if (error.errCode === -1) {
      await updateUserStats(openid)
      return await getUserStats(openid)
    }
    throw error
  }
}

async function updateUserStats(openid) {
  const [restaurantCount, dishCount, mustTryCount] = await Promise.all([
    db.collection('restaurants').where({ _openid: openid }).count(),
    db.collection('dishes').where({ _openid: openid }).count(),
    db.collection('dishes').where({ _openid: openid, rating: 'must-try' }).count()
  ])
  
  const stats = {
    totalRestaurants: restaurantCount.total || 0,
    totalDishes: dishCount.total || 0,
    mustTryCount: mustTryCount.total || 0,
    avoidCount: (dishCount.total || 0) - (mustTryCount.total || 0),
    lastUpdated: db.serverDate()
  }
  
  await db.collection('user_stats').doc(openid).set({ data: stats })
  
  return {
    code: 0,
    msg: '更新成功',
    data: stats
  }
}