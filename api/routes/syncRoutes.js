import express from "express";
import { Sidequest } from "sidequest";
import { SyncQboCustomersJob } from "../jobs/SyncQboCustomersJob.js";
import { SyncQboVendorsJob } from "../jobs/SyncQboVendorsJob.js";
import mockAuthMW from "../middlewares/mockAuthMW.js";

const router = express.Router();

const SYNC_RESPONSE_MESSAGE =
  "Your request has been submitted. Please refresh the page to see if QuickBooks data is synced or not.";

router.post("/customers", mockAuthMW, (req, res) => {
  Sidequest.build(SyncQboCustomersJob)
    .queue("default")
    .enqueue({
      tenantId: req.user.tenantId,
      branchId: req.user.branchId,
    })
    .catch((error) => {
      console.error("Failed to enqueue SyncQboCustomersJob:", error);
    });

  return res.json({ message: SYNC_RESPONSE_MESSAGE });
});

router.post("/vendors", mockAuthMW, (req, res) => {
  Sidequest.build(SyncQboVendorsJob)
    .queue("default")
    .enqueue({
      tenantId: req.user.tenantId,
      branchId: req.user.branchId,
    })
    .catch((error) => {
      console.error("Failed to enqueue SyncQboVendorsJob:", error);
    });

  return res.json({ message: SYNC_RESPONSE_MESSAGE });
});

export default router;
