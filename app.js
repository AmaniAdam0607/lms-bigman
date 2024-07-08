const cron = require('node-cron');
const { fromHrsToMills, fromMinsToMills, getTimeDifferenceInMillSecond, checkTimeDifferenceInMillSecond, differenceBetweenDatesInDays } = require('./utils/time');
const express = require('express');
const bcrypt = require('bcrypt')
const mysql = require('mysql2/promise');
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')

const initializePassport = require('./password-config')

const MAX_SICK_LEAVE_TIME = 1 // mins
const MAX_EMERGENCY_LEAVE_TIME = 1 // mins
const MAX_MATERNITY_LEAVE_TIME = 1 // mins
const MAX_ANNUAL_LEAVE_TIME = 1 // mins

const SICK_LEAVE = 2
const EMERGENCY_LEAVE = 4
const ANNUAL_LEAVE = 1
const MATERNITY_LEAVE = 3

const SESSION_SECRET = 'secret'


const app = express();
app.use(express.json());

app.set("view engine", "ejs")
app.use(express.static("public"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Amtherealist@1',
    database: 'lms_db'
});

initializePassport(passport, async (name) => {
    //console.log(name)
    const user = await getUserByName(name)
    //console.log("Value of user" + user)
    return user
},
    async (id) => {
        const user = await getUserById(id)
        //console.log("##########---------#########")
        return user
    }
)


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

app.get("/login", (req, res) => {
    res.render('login.ejs')
})

app.post("/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.get("/register", async (req, res) => {
    try {
        const Departments = await getDepartments()
        res.render('register.ejs', {Departments: Departments})
    } catch (error) {
        res.status(500).send({"ERROR": "Error loading page"})
    }
})

app.post("/register", async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const userAdded = await addNewEmployee(req.body.name, req.body.departmentId, hashedPassword)
        res.status(200).json({"STATUS" : "PASS"})
    } catch (error) {
        res.status(500).json({"STATUS" : "FAIL"})
    }
})

app.post("/new/request/", async (req, res) => {
    //console.log(req.body)

    const { userId, leaveTypeId, startDate, endDate, reason } = req.body

    try {
        const requestAdded = await addNewRequest(userId, leaveTypeId, startDate, endDate, reason)

        if (requestAdded) {
            res.json({"STATUS": "PASS"})
        }
        else {
            res.json({"STATUS": "FAIL", "MESSAGE": "You already have a pending or approved request"})
        }
    } catch (error) {
        //console.log(error.message)
        res.json({"STATUS": "FAIL", "MESSAGE" : `Internal error: ${error.message}`})
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

const getDepartments = async () => {
    let sql = 'SELECT * FROM departments'

    try {
        const [results] = await pool.query(sql)
        return results
    } catch (error) {
        throw error
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

const addNewEmployee = async (name, departmentId, password , leaveBalance = 28) => {

    let sql = 'INSERT INTO employees (name, department_id, leave_balance, password) VALUES (?,?,?,?)'

    try {
        const [results] = await pool.query(sql, [name, departmentId, leaveBalance, password])
        // console.log("User added!")
        return true
    } catch (error) {
        throw error
    }
}

// addNewEmployee("Asha Ahmedi", 2, 'tryggfhbbguuujjdbbshhdtvrhfhf')

const checkIfUserIsAlreadyApprovedOrPendingRequest = async (userId) => {
    let sql = "SELECT employee_id FROM leaverequests WHERE status = 'Approved' OR status = 'Pending'"

    try {
        const [results] = await pool.query(sql)

        let userHasApprovedLeave = false

        //console.log(results)
        // console.log(userId)
        results.forEach(idObj => {
            console.log(idObj.employee_id)
            if (idObj.employee_id === userId) {
                // console.log(true)
                //console.log("Executed this...")
                userHasApprovedLeave = true
            }
            else {
                // pass
            }
        })
        return userHasApprovedLeave
    } catch (error) {
        throw error
    }
}


const addNewRequest = async (userId, leaveTypeId, startDate, endDate, reason) => {
    let sql = 'INSERT INTO leaverequests (employee_id, leave_type_id, start_date, end_date, request_date, reason) VALUES (?, ?, ?, ?, NOW(), ?)'

    try {
        
        const userHasApprovedLeaveOrPendingRequest = await checkIfUserIsAlreadyApprovedOrPendingRequest(new Number(userId))
        console.log(userHasApprovedLeaveOrPendingRequest)
        console.log(userId)

        if(userHasApprovedLeaveOrPendingRequest) {
            // console.log("User already have approved or pending request")
            return false
        }
        else {
            const [results] = await pool.query(sql, [userId, leaveTypeId, startDate, endDate, reason])
            return true
        }
        
    } catch (error) {
        throw error
    }
}

//addNewRequest(18, 1, '2024-08-01', '2024-08-14', "Trip with family")
//checkIfUserIsAlreadyApproved(42)

const getUserById = async (userId) => {
    let sql = 'SELECT * FROM employees WHERE id = ?'

    try {
        const [results] = await pool.query(sql, [userId])
        let user = null

        if ( results.length > 0) {
            user = results[0]
        }
        // console.log(results)
        return user
    } catch (error) {
        throw error
    }
}

const getUserByName = async (name) => {
    let sql = 'SELECT * FROM employees WHERE name = ?'

    try {
        const [results] = await pool.query(sql, [name])
        //console.log(results)
        let user = null
        if (results.length > 0) {
            user = results[0]
            // 
        }
        
        //console.log(user)
        return user
    } catch (error) {
        throw error
    }
}

getUserByName("Viatu")

// deductIfLeaveIsAnnual(41)

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
cron.schedule('*/5 * * * *', processLeaveRequests);

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
