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

module.exports = { fromHrsToMills, fromMinsToMills, checkTimeDifferenceInMillSecond }