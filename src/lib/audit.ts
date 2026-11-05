import { prisma } from "./prisma";

export interface LogEventParams {
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  action: string;
  targetEntity: string;
  targetId?: string | null;
  oldValue?: any;
  newValue?: any;
  reason?: string | null;
}

export async function logActivity(params: LogEventParams) {
  try {
    return await prisma.activityLog.create({
      data: {
        actorId: params.actorId || null,
        actorName: params.actorName || null,
        actorRole: params.actorRole || null,
        action: params.action,
        targetEntity: params.targetEntity,
        targetId: params.targetId || null,
        oldValueJson: params.oldValue !== undefined ? JSON.stringify(params.oldValue) : null,
        newValueJson: params.newValue !== undefined ? JSON.stringify(params.newValue) : null,
        reason: params.reason || null,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}

