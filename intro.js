const puppeteer = require('puppeteer');
const pdf = require('pdfkit');
const fs = require('fs');

let youTubePlaylistLink = 'https://www.youtube.com/playlist?list=PLRBp0Fe2Gpgkal0so6h0jtTmulejxqeCk';
let currentTab;

(async function(){
    try {
        let browserOpen = puppeteer.launch({
            headless : false,
            defaultViewport : null,
            args : ['--start-maximized']
        })

        let browserInstance = await browserOpen;

        let allTabs = await browserInstance.pages();
        currentTab = allTabs[0];

        await currentTab.goto(youTubePlaylistLink);

        await currentTab.waitForSelector('h1#title');

        let name = await currentTab.evaluate(function(select){return document.querySelector(select).innerText}, 'h1#title');
        console.log(name);

        let allData = await currentTab.evaluate(getData, '#stats .style-scope.ytd-playlist-sidebar-primary-info-renderer');
        console.log(allData.noOfVideos, allData.noOfViews);

        let totalVideos = allData.noOfVideos.split(" ")[0];
        console.log(totalVideos)

        // without scrolling videos
        let currentVideos = await getCurrentVideosLength();
        console.log(currentVideos); // 100 in a one scroll

        while(totalVideos-currentVideos >= 10){
           await scrollToBottom();
           currentVideos = await getCurrentVideosLength();
        }

        let finalList = await getStats();
        // console.log(finalList);
        // pipe -> create a path way to create a pdf file
        let pdfDoc = new pdf;
        pdfDoc.pipe(fs.createWriteStream('playList.pdf'))

        pdfDoc.text(JSON.stringify(finalList));

        pdfDoc.end();


    } catch (error) {
        console.log(error);
    }
})();

// no of videos and no of views
function getData(selector){
    let allElements = document.querySelectorAll(selector);

    let noOfVideos = allElements[0].innerText;

    let noOfViews = allElements[1].innerText;

    return {
        noOfVideos, noOfViews
    };

}

// to get current videos on current page
async function getCurrentVideosLength(){
    let length = await currentTab.evaluate(getLength, '#container > #thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer');

    return length;
}

// get length
function getLength(durationSelect){
    let durationElement = document.querySelectorAll(durationSelect);

    return durationElement.length;
}

// scroll to bottom used to get another 100 videos -> represent pagination
async function scrollToBottom(){
    await currentTab.evaluate(goToBottom);

    function goToBottom(){
        window.scrollBy(0, window.innerHeight);
    }
}

// get data for all videos
function getNameAndDuration(videoSelector, durationSelector){
    let videoElement = document.querySelectorAll(videoSelector);

    let durationElement = document.querySelectorAll(durationSelector);

    let currList = [];

    for(let i = 0; i < durationElement.length; i++){
        let videoTitle = videoElement[i].innerText;
        let duration = durationElement[i].innerText;

        currList.push({
            videoTitle, duration
        })
    }

    return currList;
}

async function getStats(){
    let list = currentTab.evaluate(getNameAndDuration, '#video-title', '#container > #thumbnail span.style-scope.ytd-thumbnail-overlay-time-status-renderer')

    return list;
}