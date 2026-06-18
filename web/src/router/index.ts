import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'services',
        name: 'Services',
        component: () => import('@/views/ServiceList.vue'),
        meta: { title: '事项查询' },
      },
      {
        path: 'services/:id',
        name: 'ServiceDetail',
        component: () => import('@/views/ServiceDetail.vue'),
        meta: { title: '事项详情' },
      },
      {
        path: 'apply/:id',
        name: 'Apply',
        component: () => import('@/views/Apply.vue'),
        meta: { title: '材料提交' },
      },
      {
        path: 'my-applications',
        name: 'MyApplications',
        component: () => import('@/views/MyApplications.vue'),
        meta: { title: '进度跟踪' },
      },
      {
        path: 'applications/:id',
        name: 'ApplicationDetail',
        component: () => import('@/views/ApplicationDetail.vue'),
        meta: { title: '申请详情' },
      },
      {
        path: 'messages',
        name: 'Messages',
        component: () => import('@/views/Messages.vue'),
        meta: { title: '消息中心' },
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/AdminDashboard.vue'),
        meta: { title: '管理后台', admin: true },
      },
      {
        path: 'admin/review/:id',
        name: 'AdminReview',
        component: () => import('@/views/AdminReview.vue'),
        meta: { title: '申请审核', admin: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || ''} - 政务办事大厅`
  const userStr = localStorage.getItem('gov_user')
  const user = userStr ? JSON.parse(userStr) : null

  if (to.path === '/login') {
    next()
  } else if (!user) {
    next('/login')
  } else if (to.meta.admin && user.role !== 'admin') {
    next('/home')
  } else {
    next()
  }
})

export default router
