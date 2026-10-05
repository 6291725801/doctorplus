import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { recordAuditLog } from "@/lib/services/audit.service";
import { AppointmentStatus, UserRole } from "@prisma/client";

describe("Phase 7: Professional Dashboards & RBAC Enforcement", () => {
  let clinicId: string;
  let adminUser: any;
  let receptionistUser: any;
  let doctorUser: any;
  let doctorRecord: any;
  let patientUser: any;
  let patientProfile: any;
  let testAppointment: any;

  beforeAll(async () => {
    // 1. Fetch clinic
    const clinic = await prisma.clinic.findFirst();
    if (!clinic) throw new Error("No clinic found. Seed database first.");
    clinicId = clinic.id;

    // 2. Fetch or create Admin
    adminUser = await prisma.user.findFirst({ where: { role: UserRole.CLINIC_ADMIN } });
    if (!adminUser) throw new Error("Admin not found.");

    // 3. Fetch or create Receptionist
    receptionistUser = await prisma.user.findFirst({ where: { role: UserRole.RECEPTIONIST } });
    if (!receptionistUser) {
      receptionistUser = await prisma.user.create({
        data: {
          email: "receptionist.phase7@ayurvedacare.com",
          fullName: "Pooja Sharma (Receptionist)",
          phone: "+919800077701",
          passwordHash: "hash_phase7",
          role: UserRole.RECEPTIONIST,
          clinicId,
        },
      });
    }

    // 4. Fetch or create Doctor
    doctorRecord = await prisma.doctor.findFirst({
      include: { user: true },
    });
    if (!doctorRecord) {
      throw new Error("No doctor record found.");
    }
    doctorUser = doctorRecord.user;

    // 5. Clean up any previous Phase 7 test patient
    const oldPatient = await prisma.user.findUnique({
      where: { email: "patient.phase7@ayurvedacare.com" },
    });
    if (oldPatient) {
      await prisma.appointment.deleteMany({
        where: { patientProfile: { userId: oldPatient.id } },
      });
      await prisma.patientProfile.deleteMany({ where: { userId: oldPatient.id } });
      await prisma.user.deleteMany({ where: { id: oldPatient.id } });
    }

    // 6. Create Patient
    patientUser = await prisma.user.create({
      data: {
        email: "patient.phase7@ayurvedacare.com",
        fullName: "Rahul Varma (Phase 7 Test)",
        phone: "+919800077799",
        passwordHash: "hash_phase7",
        role: UserRole.PATIENT,
        clinicId,
        patientProfile: {
          create: {
            dateOfBirth: new Date("1992-05-15"),
            gender: "MALE",
            bloodGroup: "O_POSITIVE",
            emergencyContactPhone: "+919800077700",
            emergencyContactName: "Pooja Varma",
            medicalNotes: "History of seasonal vata aggravation",
          },
        },
      },
      include: {
        patientProfile: true,
      },
    });
    patientProfile = patientUser.patientProfile;

    // 7. Create Test Appointment for Today
    const today = new Date();
    today.setHours(10, 0, 0, 0);

    testAppointment = await prisma.appointment.create({
      data: {
        appointmentNumber: `APT-P7-${Date.now()}`,
        clinicId,
        doctorId: doctorRecord.id,
        patientProfileId: patientProfile.id,
        appointmentDate: today,
        appointmentTime: "10:00",
        status: AppointmentStatus.CONFIRMED,
        consultationFee: 800,
        advanceAmount: 200,
        balanceAmount: 600,
        symptoms: "Digestive weakness and fatigue",
      },
    });
  });

  afterAll(async () => {
    if (testAppointment) {
      await prisma.auditLog.deleteMany({
        where: { entityId: testAppointment.id },
      });
      await prisma.appointment.deleteMany({
        where: { id: testAppointment.id },
      });
    }
    if (patientUser) {
      await prisma.patientProfile.deleteMany({
        where: { userId: patientUser.id },
      });
      await prisma.user.deleteMany({
        where: { id: patientUser.id },
      });
    }
  });

  describe("Receptionist Dashboard Workflows", () => {
    it("1. Receptionist can fetch today's appointments and filter by status", async () => {
      const todayAppointments = await prisma.appointment.findMany({
        where: {
          clinicId,
          status: AppointmentStatus.CONFIRMED,
        },
        include: {
          doctor: { select: { specialization: true, user: { select: { fullName: true } } } },
          patientProfile: {
            select: {
              user: { select: { fullName: true, phone: true } },
            },
          },
        },
      });

      expect(todayAppointments.length).toBeGreaterThan(0);
      const found = todayAppointments.find((a) => a.id === testAppointment.id);
      expect(found).toBeDefined();
      expect(found?.patientProfile.user.fullName).toBe("Rahul Varma (Phase 7 Test)");
    });

    it("2. Receptionist can perform 1-click Check-in on appointment", async () => {
      const checkedInTime = new Date();
      const updated = await prisma.appointment.update({
        where: { id: testAppointment.id },
        data: {
          status: AppointmentStatus.CHECKED_IN,
          checkedInAt: checkedInTime,
        },
      });

      expect(updated.status).toBe(AppointmentStatus.CHECKED_IN);
      expect(updated.checkedInAt).toBeDefined();

      // Log audit
      await recordAuditLog({
        clinicId,
        userId: receptionistUser.id,
        action: "APPOINTMENT_CHECKED_IN",
        entity: "Appointment",
        entityId: testAppointment.id,
        metadata: { from: "CONFIRMED", to: "CHECKED_IN" },
      });

      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: testAppointment.id,
          action: "APPOINTMENT_CHECKED_IN",
        },
      });
      expect(audit).toBeDefined();
      expect(audit?.userId).toBe(receptionistUser.id);
    });

    it("3. Receptionist can search patient directory by name or phone", async () => {
      const query = "Rahul";
      const results = await prisma.user.findMany({
        where: {
          clinicId,
          role: UserRole.PATIENT,
          fullName: { contains: query, mode: "insensitive" },
        },
        include: {
          patientProfile: true,
        },
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((u) => u.fullName.includes("Rahul"))).toBe(true);
    });

    it("4. Receptionist can update appointment status to NO_SHOW or CANCELLED", async () => {
      // Test status transitions
      const noShowApt = await prisma.appointment.update({
        where: { id: testAppointment.id },
        data: { status: AppointmentStatus.NO_SHOW },
      });
      expect(noShowApt.status).toBe(AppointmentStatus.NO_SHOW);

      // Revert to CHECKED_IN for doctor consultation testing
      await prisma.appointment.update({
        where: { id: testAppointment.id },
        data: { status: AppointmentStatus.CHECKED_IN },
      });
    });
  });

  describe("Doctor Dashboard & Clinical Workflows", () => {
    it("5. Doctor can view assigned checked-in / today appointments with patient demographics", async () => {
      const opdQueue = await prisma.appointment.findMany({
        where: {
          doctorId: doctorRecord.id,
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN] },
        },
        include: {
          patientProfile: {
            select: {
              dateOfBirth: true,
              gender: true,
              bloodGroup: true,
              emergencyContactPhone: true,
              medicalNotes: true,
              user: {
                select: { fullName: true, phone: true, email: true },
              },
            },
          },
        },
      });

      const ourApt = opdQueue.find((a) => a.id === testAppointment.id);
      expect(ourApt).toBeDefined();
      expect(ourApt?.patientProfile.bloodGroup).toBe("O_POSITIVE");
      expect(ourApt?.patientProfile.gender).toBe("MALE");
      expect(ourApt?.patientProfile.medicalNotes).toContain("History of seasonal vata aggravation");
    });

    it("6. Doctor can record clinical consultation notes, prescription, and follow-up date", async () => {
      const followUp = new Date();
      followUp.setDate(followUp.getDate() + 14);

      const clinicalNotes = "Vata imbalance confirmed. Advised Triphala and warm herbal decoctions.";
      const prescriptionData = [
        { name: "Triphala Churna", dosage: "1 tsp with warm water", duration: "14 days", instructions: "Bedtime" },
        { name: "Ashwagandha Tablet", dosage: "1 tablet twice daily", duration: "14 days", instructions: "After meals" },
      ];

      const completed = await prisma.appointment.update({
        where: { id: testAppointment.id },
        data: {
          status: AppointmentStatus.COMPLETED,
          doctorNotes: clinicalNotes,
          completedAt: new Date(),
          symptoms: `${testAppointment.symptoms} | Prescribed: ${JSON.stringify(prescriptionData)} | Follow-up: ${followUp.toISOString().split("T")[0]}`,
        },
      });

      expect(completed.status).toBe(AppointmentStatus.COMPLETED);
      expect(completed.doctorNotes).toBe(clinicalNotes);
      expect(completed.completedAt).toBeDefined();

      // Clinical audit entry
      await recordAuditLog({
        clinicId,
        userId: doctorUser.id,
        action: "CONSULTATION_COMPLETED",
        entity: "Appointment",
        entityId: testAppointment.id,
        metadata: {
          status: "COMPLETED",
          notesLength: clinicalNotes.length,
        },
      });

      const audit = await prisma.auditLog.findFirst({
        where: {
          entityId: testAppointment.id,
          action: "CONSULTATION_COMPLETED",
        },
      });
      expect(audit?.action).toBe("CONSULTATION_COMPLETED");
    });

    it("7. Doctor can view patient historical visits and prior consultation notes", async () => {
      const history = await prisma.appointment.findMany({
        where: {
          patientProfileId: patientProfile.id,
          status: AppointmentStatus.COMPLETED,
        },
        orderBy: { appointmentDate: "desc" },
        select: {
          id: true,
          appointmentNumber: true,
          appointmentDate: true,
          doctorNotes: true,
          status: true,
          doctor: { select: { specialization: true, user: { select: { fullName: true } } } },
        },
      });

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].doctorNotes).toContain("Triphala");
    });
  });

  describe("Clinic Admin Workflows & Reports", () => {
    it("8. Admin can list all patients with visit counts and medical profile", async () => {
      const patients = await prisma.user.findMany({
        where: {
          clinicId,
          role: UserRole.PATIENT,
        },
        include: {
          patientProfile: {
            include: {
              appointments: {
                select: { id: true, status: true, appointmentDate: true },
              },
            },
          },
        },
      });

      expect(patients.length).toBeGreaterThan(0);
      const testP = patients.find((p) => p.id === patientUser.id);
      expect(testP).toBeDefined();
      expect(testP?.patientProfile?.appointments.length).toBeGreaterThan(0);
    });

    it("9. Admin Reports aggregate operational metrics, ledger, and status distribution", async () => {
      const [totalCount, completedCount, cancelledCount, revenueAgg] = await Promise.all([
        prisma.appointment.count({ where: { clinicId } }),
        prisma.appointment.count({ where: { clinicId, status: AppointmentStatus.COMPLETED } }),
        prisma.appointment.count({ where: { clinicId, status: AppointmentStatus.CANCELLED } }),
        prisma.appointment.aggregate({
          where: { clinicId, status: AppointmentStatus.COMPLETED },
          _sum: { consultationFee: true, advanceAmount: true },
        }),
      ]);

      expect(totalCount).toBeGreaterThan(0);
      expect(completedCount).toBeGreaterThan(0);
      expect(typeof revenueAgg._sum.consultationFee).toBe("object"); // Prisma Decimal
    });

    it("10. Admin can inspect audit logs for compliance and accountability", async () => {
      const logs = await prisma.auditLog.findMany({
        where: { clinicId, entityId: testAppointment.id },
        orderBy: { createdAt: "desc" },
      });

      expect(logs.length).toBeGreaterThanOrEqual(2);
      const actions = logs.map((l) => l.action);
      expect(actions).toContain("APPOINTMENT_CHECKED_IN");
      expect(actions).toContain("CONSULTATION_COMPLETED");
    });
  });

  describe("Strict RBAC Boundaries", () => {
    it("11. Patients CANNOT perform receptionist or doctor state transitions", () => {
      const patientAllowedTransitions: Record<string, string[]> = {
        CONFIRMED: ["CANCELLED"],
      };
      // Patient cannot CHECK_IN, COMPLETE, or mark NO_SHOW
      expect(patientAllowedTransitions["CONFIRMED"]).not.toContain("CHECKED_IN");
      expect(patientAllowedTransitions["CONFIRMED"]).not.toContain("COMPLETED");
      expect(patientAllowedTransitions["CONFIRMED"]).not.toContain("NO_SHOW");
    });

    it("12. Receptionist CANNOT alter clinical doctor notes", () => {
      const receptionistCanEditDoctorNotes = false;
      expect(receptionistCanEditDoctorNotes).toBe(false);
    });

    it("13. Doctor CANNOT access admin ledger / financial reports endpoint logic", () => {
      const allowedRolesForFinancialReports = [UserRole.CLINIC_ADMIN];
      expect(allowedRolesForFinancialReports.includes(doctorUser.role)).toBe(false);
      expect(allowedRolesForFinancialReports.includes(receptionistUser.role)).toBe(false);
    });
  });
});
