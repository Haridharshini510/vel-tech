import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export async function getStats() {
  const { data } = await api.get('/stats')
  return data
}

export async function getTrendingSkills(limit = 15) {
  const { data } = await api.get('/trending-skills', { params: { limit } })
  return data
}

export async function getRecentJobs(page = 1, limit = 20, source = '', search = '', skill = '', location = '') {
  const params = { page, limit }
  if (source) params.source = source
  if (search) params.search = search
  if (skill) params.skill = skill
  if (location) params.location = location
  const { data } = await api.get('/recent-jobs', { params })
  return data
}

export async function getJobTrends() {
  const { data } = await api.get('/job-trends')
  return data
}

export async function getCategoryDistribution() {
  const { data } = await api.get('/category-distribution')
  return data
}

export async function syncJobs(pages = 1, keyword = '') {
  const { data } = await api.post('/jobs/sync', null, { params: { pages, keyword } })
  return data
}

export async function syncBroadJobs() {
  const { data } = await api.post('/jobs/sync-broad')
  return data
}

export async function getSourceStats() {
  const { data } = await api.get('/jobs/sources')
  return data
}

export async function getCourses() {
  const { data } = await api.get('/courses')
  return data
}

export async function getCourse(id) {
  const { data } = await api.get(`/courses/${id}`)
  return data
}

export async function getCourseAnalysis(id) {
  const { data } = await api.get(`/courses/${id}/analysis`)
  return data
}

export async function getSkillPostings(skillName, page = 1) {
  const { data } = await api.get(`/skills/${encodeURIComponent(skillName)}/postings`, { params: { page } })
  return data
}

export async function getCompanies(limit = 50) {
  const { data } = await api.get('/companies', { params: { limit } })
  return data
}

export async function getCompanyRoles(companyName) {
  const { data } = await api.get(`/companies/${encodeURIComponent(companyName)}/roles`)
  return data
}

export async function getCompanyRoleSkills(companyName, role) {
  const { data } = await api.get(`/companies/${encodeURIComponent(companyName)}/roles/${encodeURIComponent(role)}`)
  return data
}

export async function compareWithCourse(companyName, role, courseId) {
  const { data } = await api.get(
    `/companies/${encodeURIComponent(companyName)}/roles/${encodeURIComponent(role)}/compare`,
    { params: { course_id: courseId } }
  )
  return data
}

export async function generateRoadmap(courseId, companyName = null, role = null, regenerate = false) {
  const { data } = await api.post('/roadmap/generate', {
    course_id: courseId,
    company_name: companyName,
    role,
    regenerate,
  })
  return data
}

export async function getEmergingSkills() {
  const { data } = await api.get('/emerging-skills')
  return data
}

export async function getCurriculumOverview() {
  const { data } = await api.get('/curriculum-overview')
  return data
}
