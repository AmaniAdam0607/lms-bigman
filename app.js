const express = require('express');
const mysql = require('mysql2/promise');

const MAX_SICK_LEAVE_TIME = 1 // mins
const MAX_EMERGENCY_LEAVE_TIME = 1 // mins
const MAX_MATERNITY_LEAVE_TIME = 1 // mins
const MAX_ANNUAL_LEAVE_TIME = 1 // mins

const SICK_LEAVE = 2
const EMERGENCY_LEAVE = 4
const ANNUAL_LEAVE = 1
const MATERNITY_LEAVE = 3


const app = express();
app.use(express.json());

app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Amtherealist@1',
    database: 'lms_db'
});


app.get("/staff/dashboard/:id", async ( req, res ) => {
    const { id } = req.params
    let sql = 'SELECT * FROM employees WHERE id = ?'
    try {
        const [results] = await pool.query(sql, [id])

        //console.log(results)
        let staff = results[0]
        //console.log(staff)

        try {
            let sql2 = 'SELECT * FROM departments WHERE id = ?'

            const [results] = await pool.query(sql2, [staff.department_id])

            let department = results[0]

            

            try {
                let [results] = await pool.query('SELECT * FROM leavetypes')

                // console.log(results)
                let leaves = results

                res.render("userDashboard.ejs", {staff, department, leaves})
            }
            catch (error) {
                res.status(500).send("User details not found -- leaves")
            }
        }
        catch (error) {
            res.status(500).send("User details not found -- department")
        }

    }
    catch (error) {
        res.status(500).send("User details not found")
    }
})


app.get('/reject/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const results = await rejectARequest(id);

        // Log results if necessary
        console.log('Request rejected:', results);

        res.status(200).json({"STATUS": "PASS"});
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({"STATUS": "FAIL", "MESSAGE": error.message});
    }
});

app.get('/accept/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const results = await approveARequest(id);

        // Log results if necessary
        console.log('Request rejected:', results);

        res.status(200).json({"STATUS": "PASS"});
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({"STATUS": "FAIL", "MESSAGE": error.message});
    }
});

app.get("/hod/dashboard", async ( req, res ) => {

    try {
        let totalNumberOfEmployees = await getTotalNumberOfEmployees()
        let totalNumberOfRequests = await getTotalNumberOfRequests()
        let ApprovedRequests = await getALlRequests('Approved')
        let PendingRequests = await getALlRequests('Pending')
        let RejectedRequests = await getALlRequests('Rejected')

        res.render("adminDashboard.ejs", {totalNumberOfEmployees, totalNumberOfRequests, ApprovedRequests, PendingRequests, RejectedRequests})
    } catch (error) {
        res.status.send({error: "Error accessing database"})    }

})

const getTotalNumberOfRequests = async () => {
    let sql = 'SELECT COUNT(*) FROM leaverequests'

    try {
        const [results] = await pool.query(sql)
        return results[0]['COUNT(*)']
    }
    catch (error) {
        console.log(error.message)
    }
}

const getTotalNumberOfEmployees = async () => {
    let sql = 'SELECT COUNT(*) FROM employees'

    try {
        const [results] = await pool.query(sql)
        return results[0]['COUNT(*)']
    }
    catch (error) {
        console.log(error.message)
    }
}

const getALlRequests = async (status) => {
    let sql = "SELECT * FROM leaverequests WHERE status = ?"

    try {
        const [results] = await pool.query(sql, [status])
        return results
    }
    catch (error) {
        console.log(error.message)
    }
}

const getElepasedTimes = async () => {
    let sql = 'SELECT id, employee_id, leave_type_id, start_date, end_date, status, request_date, TIMESTAMPDIFF(DAY, request_date, NOW()) AS days_elapsed, TIMESTAMPDIFF(HOUR, request_date, NOW()) % 24 AS hours_elapsed, TIMESTAMPDIFF(MINUTE, request_date, NOW()) % 60 AS minutes_elapsed, TIMESTAMPDIFF(SECOND, request_date, NOW()) % 60 AS seconds_elapsed FROM  LeaveRequests'

    try {
        const [results] = await pool.query(sql)
        console.log(results)
    } catch (error) {
        console.log(error.message)
    }
}

const getAllSickLeaves = async (id) => {
    let sql = 'SELECT * FROM leaverequests WHERE leave_type_id = ?'

    try {
        const [results] = await pool.query(sql, [id])
        
        return results
    }
    catch (error) {
        console.log(error.message)
    }
}


const approveARequest = async (requestID) => {
    let sql = "UPDATE leaverequests SET status = 'Approved' WHERE id = ?"

    try {
        const [results] = await pool.query(sql, [requestID])
        deductIfLeaveIsAnnual(requestID)
    } catch (error) {
        console.log(error.message)
        throw error
    }
}

const deductIfLeaveIsAnnual = async (requestId) => {
    let sql = 'SELECT * FROM leaverequests WHERE id = ?'

    try {
        const [results] = await pool.query(sql, [requestId])
        let leave = results[0]

        let leaveDays = differenceBetweenDatesInDays(leave.start_date, leave.end_date)
        
        // console.log(leaveDays)
        if (leave.leave_type_id === 1) {
            let user = await getUserById(leave.employee_id)
            let resultingBalance = user.leave_balance - leaveDays
            deductLeaveDays(leave.employee_id, resultingBalance)
        }
    } catch (error) {
        throw error
    }
}


const deductLeaveDays = async (userId, resultingBalance) => {
    let sql = 'UPDATE employees SET leave_balance = ? WHERE id = ?'

    try {
        const [results] = await pool.query(sql, [resultingBalance, userId])
    } catch (error) {
        throw error
    }
}

const getUserById = async (userId) => {
    let sql = 'SELECT * FROM employees WHERE id = ?'

    try {
        const [results] = await pool.query(sql, [userId])
        let user = results[0]
        // console.log(results)
        return user
    } catch (error) {
        throw error
    }
}

deductIfLeaveIsAnnual(41)

const rejectARequest = async (requestID) => {
    let sql = "UPDATE leaverequests SET status = 'Rejected' WHERE id = ?"

    try {
        const [results] = await pool.query(sql, [requestID])
        // console.log(results)
    } catch (error) {
        throw error
    }
}

// rejectARequest(60)



// getAllSickLeaves()

// getElepasedTimes()

// getALlRequests('Approved')

// getTotalNumberOfRequests()

const checkTimeConstraint = async () => {
    const sickLeaves = await getAllSickLeaves(SICK_LEAVE)

    sickLeaves.forEach(leave => {
        if (checkTimeDifferenceInMillSecond(leave.request_date, MAX_SICK_LEAVE_TIME)) {
            approveARequest(leave.id)
        }
    })

    const maternityLeaves = await getAllSickLeaves(MATERNITY_LEAVE)

    maternityLeaves.forEach(leave => {
        if (checkTimeDifferenceInMillSecond(leave.request_date, MAX_MATERNITY_LEAVE_TIME)) {
            approveARequest(leave.id)
        }
    })

    const annualLeaves = await getAllSickLeaves(ANNUAL_LEAVE)

    annualLeaves.forEach(leave => {
        if (checkTimeDifferenceInMillSecond(leave.request_date, MAX_ANNUAL_LEAVE_TIME)) {
            approveARequest(leave.id)
        }
    })

    const emergencyLeaves = await getAllSickLeaves(EMERGENCY_LEAVE)

    emergencyLeaves.forEach(leave => {
        if (checkTimeDifferenceInMillSecond(leave.request_date, MAX_EMERGENCY_LEAVE_TIME)) {
            approveARequest(leave.id)
        }
    })


}

const processLeaveRequests = async () => {
    console.log("Running...every 5 minutes")
    try {
        const connection = await pool.getConnection();

        checkTimeConstraint()

        connection.release();
    } catch (err) {
        console.error(err);
    }
};

// Set up a cron job to run the processLeaveRequests function every hour
const cron = require('node-cron');
const { fromHrsToMills, fromMinsToMills, getTimeDifferenceInMillSecond, checkTimeDifferenceInMillSecond, differenceBetweenDatesInDays } = require('./utils/time');
cron.schedule('*/5 * * * *', processLeaveRequests);

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
