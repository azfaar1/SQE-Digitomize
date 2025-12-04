import User from "../models/User.js";
// Replace the current handleUserDashboard function with this fixed version:

const handleUserDashboard = async (req, res) => {
  try {
    const userId = req.decodedToken.uid;
    const user = await User.findOne({ uid: userId }).select(
      "-_id -password -createdAt -updatedAt -__v",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Construct the JSON response with proper null checks
    const jsonResponse = {
      personal_data: {
        uid: user.uid,
        username: user.username,
        role: user.role,
        name: user.name,
        picture: user.picture,
        resume: user.resume,
        email_verified: user.email_verified,
        email: user.email,
        email_show: user.email_show,
        skills: user.skills || null,
        education: user.education || null,
        preferences: user?.preferences || null,
        bio: user.bio ? {
          data: user.bio.data || null,
          showOnWebsite: user.bio.showOnWebsite || false
        } : null,
        phoneNumber: user.phoneNumber ? {
          data: user.phoneNumber.data || null,
          showOnWebsite: user.phoneNumber.showOnWebsite || false
        } : null,
        dateOfBirth: user.dateOfBirth ? {
          data: user.dateOfBirth.data || null,
          showOnWebsite: user.dateOfBirth.showOnWebsite || false
        } : null,
      },
      github: user.github ? {
        data: user.github.data || null,
        showOnWebsite: user.github.showOnWebsite || false
      } : null,
      social: {
        linkedin: user.social?.linkedin || null,
        instagram: user.social?.instagram || null,
        twitter: user.social?.twitter || null,
      },
      ratings: {
        codeforces: {
          data: user.codeforces?.username || null,
          showOnWebsite: user.codeforces?.showOnWebsite || false
        },
        codechef: {
          data: user.codechef?.username || null,
          showOnWebsite: user.codechef?.showOnWebsite || false
        },
        leetcode: {
          data: user.leetcode?.username || null,
          showOnWebsite: user.leetcode?.showOnWebsite || false
        },
        digitomize_rating: user.digitomize_rating || null,
      },
    };

    res.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { handleUserDashboard };