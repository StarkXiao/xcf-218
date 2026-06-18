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
        path: 'book/:id',
        name: 'BookAppointment',
        component: () => import('@/views/BookAppointment.vue'),
        meta: { title: '预约取号' },
      },
      {
        path: 'apply/:id',
        name: 'Apply',
        component: () => import('@/views/Apply.vue'),
        meta: { title: '材料提交' },
      },
      {
        path: 'my-appointments',
        name: 'MyAppointments',
        component: () => import('@/views/MyAppointments.vue'),
        meta: { title: '我的预约' },
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
        path: 'supplement-center',
        name: 'SupplementCenter',
        component: () => import('@/views/SupplementCenter.vue'),
        meta: { title: '补件中心' },
      },
      {
        path: 'proxy-apply',
        name: 'ProxyApply',
        component: () => import('@/views/ProxyApply.vue'),
        meta: { title: '代办人申请' },
      },
      {
        path: 'my-proxy-applications',
        name: 'MyProxyApplications',
        component: () => import('@/views/MyProxyApplications.vue'),
        meta: { title: '我的代办申请' },
      },
      {
        path: 'proxy-applications/:id',
        name: 'ProxyApplicationDetail',
        component: () => import('@/views/ProxyApplicationDetail.vue'),
        meta: { title: '代办申请详情' },
      },
      {
        path: 'proxy-relations',
        name: 'ProxyRelations',
        component: () => import('@/views/ProxyRelations.vue'),
        meta: { title: '代办关系管理' },
      },
      {
        path: 'my-favorites',
        name: 'MyFavorites',
        component: () => import('@/views/MyFavorites.vue'),
        meta: { title: '我的收藏' },
      },
      {
        path: 'my-subscriptions',
        name: 'MySubscriptions',
        component: () => import('@/views/MySubscriptions.vue'),
        meta: { title: '我的订阅' },
      },
      {
        path: 'my-certificates',
        name: 'MyCertificates',
        component: () => import('@/views/MyCertificates.vue'),
        meta: { title: '我的证明' },
      },
      {
        path: 'certificates/:id',
        name: 'CertificateDetail',
        component: () => import('@/views/CertificateDetail.vue'),
        meta: { title: '证明详情' },
      },
      {
        path: 'my-window-handlings',
        name: 'MyWindowHandlings',
        component: () => import('@/views/MyWindowHandlings.vue'),
        meta: { title: '窗口办理记录' },
      },
      {
        path: 'admin/service-items',
        name: 'AdminServiceItems',
        component: () => import('@/views/AdminServiceItems.vue'),
        meta: { title: '事项管理', admin: true },
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('@/views/AdminDashboard.vue'),
        meta: { title: '管理后台', admin: true },
      },
      {
        path: 'admin/schedule',
        name: 'AdminSchedule',
        component: () => import('@/views/AdminSchedule.vue'),
        meta: { title: '排班管理', admin: true },
      },
      {
        path: 'admin/appointments',
        name: 'AdminAppointments',
        component: () => import('@/views/AdminAppointments.vue'),
        meta: { title: '预约办理', admin: true },
      },
      {
        path: 'admin/supplement',
        name: 'AdminSupplement',
        component: () => import('@/views/AdminSupplement.vue'),
        meta: { title: '补件管理', admin: true },
      },
      {
        path: 'admin/proxy',
        name: 'AdminProxy',
        component: () => import('@/views/AdminProxy.vue'),
        meta: { title: '代办人审核', admin: true },
      },
      {
        path: 'admin/review/:id',
        name: 'AdminReview',
        component: () => import('@/views/AdminReview.vue'),
        meta: { title: '申请审核', admin: true },
      },
      {
        path: 'admin/certificates',
        name: 'AdminCertificates',
        component: () => import('@/views/AdminCertificates.vue'),
        meta: { title: '证明管理', admin: true },
      },
      {
        path: 'admin/window-coordination',
        name: 'AdminWindowCoordination',
        component: () => import('@/views/AdminWindowHandling.vue'),
        meta: { title: '窗口协同办理', admin: true },
      },
      {
        path: 'admin/queue-display',
        name: 'AdminQueueDisplay',
        component: () => import('@/views/AdminQueueDisplay.vue'),
        meta: { title: '叫号大屏', admin: true },
      },
      {
        path: 'admin/material-templates',
        name: 'AdminMaterialTemplates',
        component: () => import('@/views/AdminMaterialTemplates.vue'),
        meta: { title: '材料模板管理', admin: true },
      },
      {
        path: 'approvals/pending',
        name: 'MyPendingApprovals',
        component: () => import('@/views/MyPendingApprovals.vue'),
        meta: { title: '待办审批' },
      },
      {
        path: 'approvals/:applicationId',
        name: 'ApprovalDetail',
        component: () => import('@/views/ApprovalDetail.vue'),
        meta: { title: '审批详情' },
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
