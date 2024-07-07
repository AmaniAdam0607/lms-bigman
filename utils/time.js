const fromMinsToMills = (minutes) => {
    return minutes * 60 * 1000;
}

const fromHrsToMills = (hours) => {
    return hours * 60 * 60 * 1000;
}

const checkTimeDifferenceInMillSecond = (givenTimestamp, MAX_TIME) => {
    // Given is in ISO 8601 timestamp

    // Parse the given timestamp into a Date object
    const givenDate = new Date(givenTimestamp);

    // Get the current date and time
    const currentDate = new Date();

    // Calculate the difference in milliseconds
    const differenceInMilliseconds = currentDate - givenDate;

    return differenceInMilliseconds > fromMinsToMills(MAX_TIME)
}

const differenceBetweenDatesInDays = (day1, day2) => {
        // Dates in ISO format
    const date1 = new Date(day1);
    const date2 = new Date(day2);

    // Calculate the difference in milliseconds
    const differenceMs = Math.abs(date2 - date1);

    // Convert milliseconds to days
    const differenceDays = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

    return differenceDays
    // console.log(`Difference in days: ${differenceDays}`);

}

module.exports = { differenceBetweenDatesInDays, fromHrsToMills, fromMinsToMills, checkTimeDifferenceInMillSecond }