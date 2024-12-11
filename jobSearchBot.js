const axios = require('axios');
const mongoose = require('mongoose');
const cron = require('node-cron');
require('dotenv').config();

// MongoDB Job Model
const JobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    link: { type: String, unique: true },
    description: String,
    source: { type: String, default: 'RapidAPI' },
    location: String,
    employmentType: String,
    createdAt: { type: Date, default: Date.now },
    sentAt: Date
});
const Job = mongoose.model('Job', JobSchema);

class JobSearchBot {
    constructor() {
        // MongoDB Connection
        this.connectToMongoDB();

        // Expanded job search configuration
        this.jobSearchQueries = [
            { 
                query: 'Junior Developer', 
                location: 'Israel',
                keywords: ['junior', 'entry level', 'beginner']
            },
            { 
                query: 'Entry Level Software Engineer', 
                location: 'Israel',
                keywords: ['frontend', 'backend', 'full stack']
            },
            { 
                query: 'React Developer', 
                location: 'Israel',
                keywords: ['react', 'javascript', 'web development']
            },
            { 
                query: 'Front End Developer', 
                location: 'Israel',
                keywords: ['react', 'javascript', 'web development']
            },
            { 
                query: 'FrontEnd Developer', 
                location: 'Israel',
                keywords: ['react', 'javascript', 'web development']
            },
            { 
                query: 'Full Stack Developer', 
                location: 'Israel',
                keywords: ['react', 'javascript', 'web development']
            },
            { 
                query: 'FullStack Developer', 
                location: 'Israel',
                keywords: ['react', 'javascript', 'web development']
            },
            { 
                query: 'SoftWare Developer', 
                location: 'Israel',
                keywords: ['react', 'javascript', 'web development']
            },
        ];

        // RapidAPI configuration
        this.rapidApiOptions = {
            method: 'GET',
            url: 'https://jobs-api14.p.rapidapi.com/v2/list',
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'jobs-api14.p.rapidapi.com'
            }
        };
    }

    async connectToMongoDB() {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {});
            console.log('Connected to MongoDB successfully');
        } catch (error) {
            console.error('MongoDB connection error:', error);
        }
    }

    async fetchAndSaveJobs() {
        let savedJobs = [];

        // Iterate through different job search queries
        for (const searchConfig of this.jobSearchQueries) {
            try {
                // Dynamic API options for each search
                const apiOptions = {
                    ...this.rapidApiOptions,
                    params: {
                        query: searchConfig.query,
                        location: searchConfig.location,
                        autoTranslateLocation: 'false',
                        remoteOnly: 'true',
                        employmentTypes: 'fulltime;parttime;intern'
                    }
                };

                // Fetch jobs from RapidAPI
                const response = await axios.request(apiOptions);
                const jobs = response.data.jobs || [];

                // Filter jobs based on keywords
                const filteredJobs = jobs.filter(job => 
                    searchConfig.keywords.some(keyword => 
                        job.title.toLowerCase().includes(keyword.toLowerCase()) || 
                        job.description.toLowerCase().includes(keyword.toLowerCase())
                    )
                );

                // Save up to remaining slots
                for (const jobData of filteredJobs) {
                    // Stop if we've saved 10 jobs total
                    if (savedJobs.length >= 10) break;

                    try {
                        // Check if job already exists to prevent duplicates
                        const existingJob = await Job.findOne({ link: jobData.link });
                        
                        if (!existingJob) {
                            const job = new Job({
                                title: jobData.title,
                                link: jobData.link,
                                description: jobData.description,
                                location: jobData.location,
                                employmentType: jobData.employmentType || 'Not specified'
                            });

                            await job.save();
                            savedJobs.push(job);
                        }
                    } catch (saveError) {
                        console.error('Error saving individual job:', saveError);
                    }

                    // Break if we've reached 10 jobs
                    if (savedJobs.length >= 10) break;
                }

                // Break outer loop if we've reached 10 jobs
                if (savedJobs.length >= 10) break;

            } catch (error) {
                console.error(`Error fetching jobs for ${searchConfig.query}:`, error.response ? error.response.data : error.message);
            }
        }

        console.log(`Saved ${savedJobs.length} new jobs to MongoDB`);
        return savedJobs;
    }

    startScheduler() {
        // Run every hour
        cron.schedule('* * * * *', async () => {
            console.log('Starting job search...');
            await this.fetchAndSaveJobs();
        });
    }

    // Manual trigger method
    async runJobSearch() {
        return await this.fetchAndSaveJobs();
    }
}

// Initialize and start the bot
const jobSearchBot = new JobSearchBot();
jobSearchBot.startScheduler();

module.exports = jobSearchBot;