const fs = require('fs');
const fetch = require('node-fetch');
const moment = require('moment');
const httpsProxyAgent = require('https-proxy-agent');

/**
 * Update these appropriately each time.
 */
const CONTRIBUTIONS_SINCE_DATE = '2018-04-01';
const CONTRIBUTIONS_UNTIL_DATE = '2018-05-31';

const GITHUB_USERNAMES = ['poshaughnessy', 'diekus', 'AdaRoseCannon', 'torgo', 'thisisjofrank'];
// Construct username parameters by adding 'author%3A' in front of each username, followed by a plus
const GITHUB_USER_PARAMS = GITHUB_USERNAMES.reduce(function(accumulator, value) { return `author%3A${value}+${accumulator}`; }, '');
const GITHUB_API_PULL_REQUESTS_URL = `https://api.github.com/search/issues?q=${GITHUB_USER_PARAMS}type%3Apr+sort%3Aupdated+created%3A%3E${CONTRIBUTIONS_SINCE_DATE}+created%3A%3C${CONTRIBUTIONS_UNTIL_DATE}`;
const githubAPICommitsURL = function(userId) { return `https://api.github.com/users/${userId}/events?per_page=100`; };

const OUTPUT_PATH = 'pullRequests.js';

// Can ignore specific repos if we want to
const GITHUB_REPOS_IGNORE_LIST = [];

const proxy = process.env.http_proxy;
let fetchOptions = null;

if (proxy) {
    console.log('Using proxy server', proxy);
    fetchOptions = {agent: new httpsProxyAgent(proxy)};
}

async function fetchGithubPullRequests() {

    console.log('Fetching Github Pull Requests...');

    try {
        const response = await fetch(GITHUB_API_PULL_REQUESTS_URL, fetchOptions);
        return await response.json();
    } catch(error) {
        console.log('Error fetching Github PRs', error);
    }

}

/*
async function fetchGithubCommits(userId) {

    console.log('Fetching Github Commits for', userId);

    try {
        const response = await fetch(githubAPICommitsURL(userId), fetchOptions);
        return await response.json();
    } catch(error) {
        console.log('Error fetching Github commits', userId, error);
    }

}
*/

function processGithubPullRequests(githubPRs, output) {

    output.pullRequests =
        githubPRs.items.reduce(function(accumulator, value) {

            var repo = value.repository_url.replace('https://api.github.com/repos/', '');

            if (!GITHUB_REPOS_IGNORE_LIST.includes(repo)) {
                accumulator.push({
                    url: value.html_url, 
                    title: value.title, 
                    author: value.user.login
                });
            }
            return accumulator;
        }, []);
}

/*
function processGithubCommits(githubCommits, output) {

    output.commits = output.commits || [];

    const processedCommits = 
        githubCommits.reduce(function(accumulator, value) {

            const time = moment(value.created_at);

            if ((value.type === 'PushEvent' || value.type === 'CreateEvent') 
                && time.isSameOrAfter(moment(CONTRIBUTIONS_SINCE_DATE)) && time.isSameOrBefore(moment(CONTRIBUTIONS_UNTIL_DATE))) {

                var repo = value.repo.url.replace('https://api.github.com/repos/', '');
                accumulator.push({
                    id: value.id, 
                    author: value.actor.login, 
                    repo: repo, 
                    commits: value.commits,
                    time: value.created_at
                });

            }

            return accumulator;

        }, []);

    if (processedCommits.length) {
        output.commits.concat(processedCommits);
    }

}
*/

function writeOutput(output) {

    fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), function(err) {
        if (err) {
        console.log('Error writing output', err);
        } else {
        console.log(`Updated ${OUTPUT_PATH} ✔`);
        }
    });
}

async function run() {

    const githubPRs = await fetchGithubPullRequests();
    
    let processedJSON = {};
    processGithubPullRequests(githubPRs, processedJSON);

    // for (let i=0; i < GITHUB_USERNAMES.length; i++) {
    //     const githubCommits = await fetchGithubCommits(GITHUB_USERNAMES[i]);
    //     processGithubCommits(githubCommits, processedJSON);
    // }
    
    writeOutput(processedJSON);

}

run();
