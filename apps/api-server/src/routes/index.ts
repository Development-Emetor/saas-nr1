import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tenantsRouter from "./tenants";
import organizationsRouter from "./organizations";
import dashboardRouter from "./dashboard";
import nr1Router from "./nr1";
import recruitmentRouter from "./recruitment";
import clientsRouter from "./clients";
import { tenantMiddleware } from "../lib/tenantMiddleware";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tenantMiddleware);
router.use(tenantsRouter);
router.use(organizationsRouter);
router.use(dashboardRouter);
router.use(nr1Router);
router.use(recruitmentRouter);
router.use(clientsRouter);

export default router;
