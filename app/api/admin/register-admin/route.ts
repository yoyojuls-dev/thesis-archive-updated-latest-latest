import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/libs/prismadb";
import getCurrentUser from "@/actions/getCurrentUser";
import { sendVerificationEmail } from "@/libs/emailService";
import { generateVerificationToken } from "@/utils/tokens";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    // Only SUPER_ADMIN can create ADMIN accounts
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      password, 
      adminId,
      college,
      department,
      position,
      birthdate
    } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" }, 
        { status: 400 }
      );
    }

    // Check if admin user already exists
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "Admin with this email already exists" }, 
        { status: 400 }
      );
    }

    // Check if student user with same email exists
    const existingStudent = await prisma.studentUser.findUnique({
      where: { email }
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "User with this email already exists" }, 
        { status: 400 }
      );
    }

    // Check if admin ID is already taken (if provided)
    if (adminId) {
      const existingAdminId = await prisma.adminUser.findUnique({
        where: { adminId }
      });

      if (existingAdminId) {
        return NextResponse.json(
          { error: "Admin ID already exists" }, 
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate verification token
    const verificationToken = generateVerificationToken();

    // Create admin user with PENDING status
    const adminUser = await prisma.adminUser.create({
      data: {
        name,
        email,
        hashedPassword,
        adminId,
        college,
        department,
        position: position || "Admin Officer",
        birthdate: birthdate ? new Date(birthdate) : null,
        verificationToken,
        status: "PENDING", // Admin needs super admin verification
        role: "ADMIN",
        permissions: ["manage_thesis", "manage_students"]
      }
    });

    // Send email verification
    try {
      await sendVerificationEmail(email, verificationToken, name);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Admin account created successfully! Admin must verify their email and will be pending approval.",
      adminId: adminUser.id
    });

  } catch (error) {
    console.error("Admin registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

// GET - Get pending admins for super admin review
export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    // Only SUPER_ADMIN can view pending admins
    if (!currentUser || currentUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." }, 
        { status: 403 }
      );
    }

    const pendingAdmins = await prisma.adminUser.findMany({
      where: {
        status: "PENDING"
      },
      select: {
        id: true,
        name: true,
        email: true,
        adminId: true,
        college: true,
        department: true,
        position: true,
        emailVerified: true,
        createdAt: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return NextResponse.json({
      success: true,
      pendingAdmins
    });

  } catch (error) {
    console.error("Get pending admins error:", error);
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}