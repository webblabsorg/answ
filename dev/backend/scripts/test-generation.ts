/**
 * Test Script for Question Generation
 * 
 * This script tests the question generation pipeline by:
 * 1. Generating 100 questions for GRE Verbal Reasoning
 * 2. Monitoring job progress
 * 3. Reporting statistics on quality, cost, and approval rates
 * 
 * Usage:
 *   npm run test:generation
 * 
 * Prerequisites:
 *   - Backend running (npm run start:dev)
 *   - Database migrated
 *   - Redis running (for BullMQ)
 *   - AI API keys configured (.env)
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

// Configuration
const TEST_CONFIG = {
  examId: 'gre-exam-id', // Replace with actual exam ID
  topic: 'Verbal Reasoning',
  subtopic: 'Text Completion',
  difficulty: 4,
  count: 100,
};

interface GenerationJob {
  id: string;
  status: string;
  progress: number;
  generated_count: number;
  failed_count: number;
  total_cost: number;
}

interface GeneratedQuestion {
  id: string;
  quality_score: number;
  status: string;
  validation_warnings: string[];
  validation_errors: string[];
}

async function login() {
  console.log('🔐 Logging in as admin...');
  
  const response = await axios.post(`${API_BASE_URL}/auth/login`, {
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  });
  
  return response.data.access_token;
}

async function startGeneration(token: string) {
  console.log(`\n📝 Starting generation of ${TEST_CONFIG.count} questions...`);
  console.log(`   Exam: ${TEST_CONFIG.examId}`);
  console.log(`   Topic: ${TEST_CONFIG.topic}`);
  console.log(`   Difficulty: ${TEST_CONFIG.difficulty}/5\n`);
  
  const response = await axios.post(
    `${API_BASE_URL}/admin/generation/start`,
    TEST_CONFIG,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return response.data.id;
}

async function monitorJob(token: string, jobId: string): Promise<GenerationJob> {
  const response = await axios.get(
    `${API_BASE_URL}/admin/generation/jobs/${jobId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return response.data;
}

async function getReviewQueue(token: string): Promise<GeneratedQuestion[]> {
  const response = await axios.get(
    `${API_BASE_URL}/admin/generation/review-queue?limit=1000`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return response.data;
}

async function getMetrics(token: string) {
  const response = await axios.get(
    `${API_BASE_URL}/admin/generation/metrics`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  
  return response.data;
}

function printProgress(job: GenerationJob) {
  const progressBar = '█'.repeat(Math.floor(job.progress * 50)) + 
                      '░'.repeat(50 - Math.floor(job.progress * 50));
  
  process.stdout.write(`\r${progressBar} ${(job.progress * 100).toFixed(1)}% | ` +
    `Generated: ${job.generated_count} | Failed: ${job.failed_count} | ` +
    `Cost: $${job.total_cost.toFixed(2)}`);
}

function analyzeQuestions(questions: GeneratedQuestion[]) {
  console.log('\n\n📊 Question Analysis:');
  console.log('━'.repeat(80));
  
  const qualityBuckets = {
    excellent: questions.filter(q => q.quality_score >= 0.9).length,
    good: questions.filter(q => q.quality_score >= 0.8 && q.quality_score < 0.9).length,
    acceptable: questions.filter(q => q.quality_score >= 0.7 && q.quality_score < 0.8).length,
    poor: questions.filter(q => q.quality_score < 0.7).length,
  };
  
  console.log(`\n   Quality Distribution:`);
  console.log(`   • Excellent (≥0.9):  ${qualityBuckets.excellent} questions (${(qualityBuckets.excellent / questions.length * 100).toFixed(1)}%)`);
  console.log(`   • Good (0.8-0.9):    ${qualityBuckets.good} questions (${(qualityBuckets.good / questions.length * 100).toFixed(1)}%)`);
  console.log(`   • Acceptable (0.7-0.8): ${qualityBuckets.acceptable} questions (${(qualityBuckets.acceptable / questions.length * 100).toFixed(1)}%)`);
  console.log(`   • Poor (<0.7):       ${qualityBuckets.poor} questions (${(qualityBuckets.poor / questions.length * 100).toFixed(1)}%)`);
  
  const avgQuality = questions.reduce((sum, q) => sum + q.quality_score, 0) / questions.length;
  console.log(`\n   Average Quality Score: ${avgQuality.toFixed(3)}`);
  
  const withWarnings = questions.filter(q => q.validation_warnings.length > 0).length;
  const withErrors = questions.filter(q => q.validation_errors.length > 0).length;
  
  console.log(`\n   Validation:`);
  console.log(`   • With Warnings: ${withWarnings} (${(withWarnings / questions.length * 100).toFixed(1)}%)`);
  console.log(`   • With Errors:   ${withErrors} (${(withErrors / questions.length * 100).toFixed(1)}%)`);
  
  // Top warnings/errors
  const allWarnings = questions.flatMap(q => q.validation_warnings);
  const warningCounts = allWarnings.reduce((acc, w) => {
    acc[w] = (acc[w] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  if (Object.keys(warningCounts).length > 0) {
    console.log(`\n   Common Warnings:`);
    Object.entries(warningCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([warning, count]) => {
        console.log(`   • ${warning}: ${count} times`);
      });
  }
}

async function main() {
  try {
    console.log('🚀 Question Generation Test Script');
    console.log('━'.repeat(80));
    
    // Login
    const token = await login();
    console.log('✅ Logged in successfully\n');
    
    // Start generation
    const jobId = await startGeneration(token);
    console.log(`✅ Generation job started: ${jobId}`);
    
    // Monitor progress
    console.log('\n⏳ Monitoring progress...\n');
    
    let job: GenerationJob;
    do {
      job = await monitorJob(token, jobId);
      printProgress(job);
      
      if (job.status === 'IN_PROGRESS' || job.status === 'PENDING') {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    } while (job.status === 'IN_PROGRESS' || job.status === 'PENDING');
    
    console.log('\n\n✅ Generation complete!');
    
    // Get final statistics
    console.log('\n\n📈 Final Statistics:');
    console.log('━'.repeat(80));
    console.log(`   Status: ${job.status}`);
    console.log(`   Generated: ${job.generated_count} questions`);
    console.log(`   Failed: ${job.failed_count} attempts`);
    console.log(`   Total Cost: $${job.total_cost.toFixed(4)}`);
    console.log(`   Cost per Question: $${(job.total_cost / job.generated_count).toFixed(4)}`);
    
    // Get review queue
    console.log('\n\n📋 Fetching review queue...');
    const questions = await getReviewQueue(token);
    const jobQuestions = questions.filter((q: any) => q.generation_job_id === jobId);
    
    // Analyze questions
    analyzeQuestions(jobQuestions);
    
    // Get overall metrics
    const metrics = await getMetrics(token);
    console.log('\n\n🎯 Overall Metrics:');
    console.log('━'.repeat(80));
    console.log(`   Total Questions Generated: ${metrics.total}`);
    console.log(`   Approval Rate: ${(metrics.approvalRate * 100).toFixed(1)}%`);
    console.log(`   Average Quality Score: ${metrics.avgQualityScore.toFixed(3)}`);
    console.log(`   Average Cost per Question: $${metrics.avgCostPerQuestion.toFixed(4)}`);
    
    console.log('\n\n✅ Test complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Review questions at: http://localhost:3000/admin/review-queue');
    console.log(`   2. Approve high-quality questions (≥0.8)`);
    console.log(`   3. Reject or revise low-quality questions (<0.7)`);
    
  } catch (error: any) {
    console.error('\n\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the script
main();
