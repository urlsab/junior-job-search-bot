const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
require('dotenv').config();

// cpc2aMY2JlajEZFb - mongo db jobsbot cluster password
// mongo project name - jobs-bot
// mongodb coluster name - jobsBot
// mongodb collection name - jobs-bot
// mongodb database name - roles

// MongoDB Job Model
const JobSchema = new mongoose.Schema({
    title: String,
    link: { type: String, unique: true },
    description: String,
    source: String,
    createdAt: { type: Date, default: Date.now },
    sentAt: Date
});
const Job = mongoose.model('Job', JobSchema);

class JobSearchBot {
    constructor() {
        // MongoDB Connection
        this.connectToMongoDB();

        // Email transporter
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        // Job search configuration
        this.searchSites = [
            'https://www.linkedin.com/jobs',
            'https://www.indeed.com/jobs',
            'https://www.glassdoor.com/Job'
        ];

        this.keywords = [
            'junior developer', 
            'entry level', 
            'full stack', 
            'frontend', 
            'react', 
            'nodejs'
        ];
    }

    

    

    async connectToMongoDB() {
        try {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job_search_db', {
                // useNewUrlParser: true,
                // useUnifiedTopology: true
            });
            console.log('Connected to MongoDB successfully');
        } catch (error) {
            console.error('MongoDB connection error:', error);
        }
    }

    

    // async scrapeJobsWithPuppeteer(url) {
    //     const browser = await puppeteer.launch({
    //         executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    //         args: ['--no-sandbox', '--disable-setuid-sandbox']
    //     });
        
    //     const page = await browser.newPage();
    //     await page.goto(url, { waitUntil: 'networkidle2' });

    //     const jobs = await page.evaluate((keywords) => {
    //         const jobElements = document.querySelectorAll('.job-listing');
    //         return Array.from(jobElements).map(el => ({
    //             title: el.querySelector('.job-title')?.innerText,
    //             link: el.querySelector('a')?.href,
    //             description: el.querySelector('.job-description')?.innerText
    //         })).filter(job => 
    //             keywords.some(keyword => 
    //                 job.title.toLowerCase().includes(keyword) || 
    //                 job.description.toLowerCase().includes(keyword)
    //             )
    //         );
    //     }, this.keywords);

    //     await browser.close();
    //     return jobs;
    // }

    async findNewJobs() {
        const newJobs = [];

        for (const site of this.searchSites) {
            try {
                const siteJobs = await this.scrapeJobsWithPuppeteer(site);
                
                for (const jobData of siteJobs) {
                    // Check if job already exists in DB
                    const existingJob = await Job.findOne({ link: jobData.link });
                    
                    if (!existingJob) {
                        const job = new Job({
                            ...jobData,
                            source: new URL(site).hostname
                        });
                        await job.save();
                        newJobs.push(job);
                    }
                }
            } catch (error) {
                console.error(`Error scraping ${site}:`, error);
            }
        }

        return newJobs.slice(0, 10);
    }

    

    async sendJobsEmail(jobs) {
        if (jobs.length === 0) return;

        const jobsHTML = jobs.map(job => `
            <div style="margin-bottom: 15px; border-bottom: 1px solid #ddd;">
                <h3>${job.title}</h3>
                <p><strong>Source:</strong> ${job.source}</p>
                <p><strong>Link:</strong> <a href="${job.link}">${job.link}</a></p>
                <p>${job.description.substring(0, 200)}...</p>
            </div>
        `).join('');

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: process.env.RECIPIENT_EMAIL,
            subject: `New Junior Developer Jobs - ${new Date().toLocaleDateString()}`,
            html: `
                <html>
                    <body>
                        <h1>Daily Job Search Results</h1>
                        ${jobsHTML}
                    </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Job notification email sent successfully');
        } catch (error) {
            console.error('Email sending error:', error);
        }
    }

    

    startScheduler() {
        // Run daily at 9 AM
        // cron.schedule('55 21 * * *', async () => {
        //     console.log('Starting daily job search...');

            const options = {
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
                  'x-rapidapi-key': 'd37312a5efmsh99c6bb485cfff56p173ce8jsn17cbf1cbd077',
                  'x-rapidapi-host': 'jobs-api14.p.rapidapi.com'
                }
              };
              
              try {
                  const response = axios.request(options);
                  console.log(response.data);
              } catch (error) {
                  console.error(error);
              }

        //     const newJobs = await this.findNewJobs();
        //     await this.sendJobsEmail(newJobs);
        // });
    }
}



// Initialize and start the bot
const jobSearchBot = new JobSearchBot();
jobSearchBot.startScheduler();

module.exports = jobSearchBot;

/**
 
Docker Deployment Steps:
```bash
# Build and run the containers
docker-compose up --build

# Run in background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs job-search-bot
```

Key Improvements:
- Added MongoDB for job tracking
- Used Puppeteer for more robust web scraping
- Containerized application
- Added error handling
- Persistent job storage
- Automated daily job search and email

Recommended Next Steps:
1. Configure your Gmail App Password
2. Adjust job search keywords
3. Customize scraping selectors
4. Set up additional error logging

Would you like me to elaborate on any part of the implementation?
 */