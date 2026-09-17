"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const db_1 = __importDefault(require("./config/db"));
const Claim_1 = __importDefault(require("./models/Claim"));
const Counter_1 = __importDefault(require("./models/Counter"));
const Policy_1 = __importDefault(require("./models/Policy"));
const User_1 = __importDefault(require("./models/User"));
dotenv_1.default.config();
const seedConfirm = (process.env.SEED_CONFIRM || '').toLowerCase();
if (seedConfirm !== 'true') {
    console.error('Seeding requires SEED_CONFIRM=true');
    process.exit(1);
}
const seedDatabase = async () => {
    await (0, db_1.default)();
    await Promise.all([
        Claim_1.default.deleteMany({}),
        Policy_1.default.deleteMany({}),
        User_1.default.deleteMany({}),
        Counter_1.default.deleteMany({}),
    ]);
    const users = await User_1.default.create([
        {
            name: 'Avery Admin',
            email: 'admin@capstone.local',
            password: 'Password123!',
            role: 'admin',
        },
        {
            name: 'Jordan Adjuster',
            email: 'adjuster1@capstone.local',
            password: 'Password123!',
            role: 'adjuster',
        },
        {
            name: 'Taylor Adjuster',
            email: 'adjuster2@capstone.local',
            password: 'Password123!',
            role: 'adjuster',
        },
    ]);
    const adminUser = users[0];
    const adjusterOne = users[1];
    const adjusterTwo = users[2];
    const policies = await Policy_1.default.create([
        {
            policyNumber: 'POL-1001',
            holderName: 'Mia Roberts',
            type: 'auto',
            premium: 820,
            status: 'active',
            effectiveDate: new Date('2026-01-01'),
            expirationDate: new Date('2026-12-31'),
            owner: adminUser._id,
        },
        {
            policyNumber: 'POL-1002',
            holderName: 'Ethan Carter',
            type: 'home',
            premium: 1450,
            status: 'expired',
            effectiveDate: new Date('2025-01-01'),
            expirationDate: new Date('2025-12-31'),
            owner: adminUser._id,
        },
        {
            policyNumber: 'POL-1003',
            holderName: 'Sophia Nguyen',
            type: 'life',
            premium: 510,
            status: 'active',
            effectiveDate: new Date('2026-03-01'),
            expirationDate: new Date('2027-03-01'),
            owner: adminUser._id,
        },
        {
            policyNumber: 'POL-1004',
            holderName: 'Liam Brooks',
            type: 'auto',
            premium: 910,
            status: 'cancelled',
            effectiveDate: new Date('2026-02-15'),
            expirationDate: new Date('2027-02-15'),
            owner: adminUser._id,
        },
        {
            policyNumber: 'POL-1005',
            holderName: 'Olivia Patel',
            type: 'home',
            premium: 1325,
            status: 'active',
            effectiveDate: new Date('2026-04-10'),
            expirationDate: new Date('2027-04-10'),
            owner: adminUser._id,
        },
    ]);
    const claimSeedData = [
        {
            policy: policies[0]._id,
            description: 'Rear bumper collision at stoplight',
            incidentDate: new Date('2026-08-05'),
            amount: 1800,
            status: 'submitted',
            assignedTo: adjusterOne._id,
            notes: [
                {
                    author: adjusterOne._id,
                    text: 'Initial photos received, estimate pending.',
                    createdAt: new Date('2026-08-06T10:00:00Z'),
                },
            ],
        },
        {
            policy: policies[1]._id,
            description: 'Kitchen pipe leak caused cabinet damage',
            incidentDate: new Date('2025-11-14'),
            amount: 6400,
            status: 'under-review',
            assignedTo: adjusterTwo._id,
            notes: [
                {
                    author: adjusterTwo._id,
                    text: 'Requested contractor quote and repair timeline.',
                    createdAt: new Date('2025-11-15T15:30:00Z'),
                },
            ],
        },
        {
            policy: policies[2]._id,
            description: 'Life claim beneficiary payout request',
            incidentDate: new Date('2026-07-01'),
            amount: 25000,
            status: 'approved',
            assignedTo: adjusterOne._id,
            notes: [],
        },
        {
            policy: policies[3]._id,
            description: 'Side mirror vandalism in parking lot',
            incidentDate: new Date('2026-06-19'),
            amount: 450,
            status: 'denied',
            assignedTo: adjusterTwo._id,
            notes: [
                {
                    author: adjusterTwo._id,
                    text: 'Claim denied due to policy cancellation before incident date.',
                    createdAt: new Date('2026-06-21T11:15:00Z'),
                },
            ],
        },
        {
            policy: policies[4]._id,
            description: 'Hail damage to roof shingles',
            incidentDate: new Date('2026-05-27'),
            amount: 9800,
            status: 'closed',
            assignedTo: adjusterOne._id,
            notes: [],
        },
        {
            policy: policies[0]._id,
            description: 'Windshield crack from highway debris',
            incidentDate: new Date('2026-09-01'),
            amount: 700,
            status: 'under-review',
            assignedTo: adjusterTwo._id,
            notes: [
                {
                    author: adjusterTwo._id,
                    text: 'Waiting on inspection appointment confirmation.',
                    createdAt: new Date('2026-09-02T09:00:00Z'),
                },
            ],
        },
    ];
    for (const claimData of claimSeedData) {
        await Claim_1.default.create(claimData);
    }
    const [userCount, policyCount, claimCount] = await Promise.all([
        User_1.default.countDocuments(),
        Policy_1.default.countDocuments(),
        Claim_1.default.countDocuments(),
    ]);
    console.log(`Seed complete: ${userCount} users, ${policyCount} policies, ${claimCount} claims`);
};
seedDatabase()
    .catch((error) => {
    console.error('Seed failed', error);
    process.exitCode = 1;
})
    .finally(async () => {
    await mongoose_1.default.disconnect();
});
