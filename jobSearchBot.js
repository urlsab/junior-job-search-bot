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

        // Job search configuration
        this.keywords = [
            'junior developer', 
            'entry level', 
            'full stack', 
            'frontend', 
            'react', 
            'nodejs'
        ];

        // RapidAPI configuration
        this.rapidApiOptions = {
            method: 'GET',
            url: 'https://jobs-api14.p.rapidapi.com/v2/list',
            params: {
                query: 'Front End Developer',
                location: 'Israel',
                autoTranslateLocation: 'false',
                remoteOnly: 'false',
                employmentTypes: 'fulltime;parttime;intern;contractor'
            },
            headers: {
                'x-rapidapi-key': process.env.RAPID_API_KEY,
                'x-rapidapi-host': 'jobs-api14.p.rapidapi.com'
            }
        };
    }

    async connectToMongoDB() {
        try {
            await mongoose.connect(process.env.MONGODB_URI, {
                // useNewUrlParser: true,
                // useUnifiedTopology: true,
                // useCreateIndex: true
            });
            console.log('Connected to MongoDB successfully');
        } catch (error) {
            console.error('MongoDB connection error:', error);
        }
    }

    async fetchAndSaveJobs() {
        try {
            // Fetch jobs from RapidAPI
            const response = await axios.request(this.rapidApiOptions);
            const jobs = response.data.jobs || [];

            // Filter jobs based on keywords
            const filteredJobs = jobs.filter(job => 
                this.keywords.some(keyword => 
                    job.title.toLowerCase().includes(keyword) || 
                    job.description.toLowerCase().includes(keyword)
                )
            );

            // Prepare and save jobs to MongoDB
            const savedJobs = [];
            for (const jobData of filteredJobs) {
                try {
                    // Check if job already exists to prevent duplicates
                    const existingJob = await Job.findOne({ link: jobData.link });
                    
                    if (!existingJob) {
                        const job = new Job({
                            title: jobData.title,
                            link: jobData.link,
                            description: jobData.description,
                            location: jobData.location,
                            employmentType: jobData.employmentType
                        });

                        await job.save();
                        savedJobs.push(job);
                    }
                } catch (saveError) {
                    console.error('Error saving individual job:', saveError);
                }
            }

            console.log(`Saved ${savedJobs.length} new jobs to MongoDB`);
            return savedJobs;
        } catch (error) {
            console.error('Error fetching jobs from RapidAPI:', error);
            return [];
        }
    }

    startScheduler() {
        // Run daily at 9 AM
        cron.schedule('* * * * *', async () => {
            console.log('Starting daily job search...');
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