import { getUser, updateUser } from "../service/User.js";

export const getUserController = async (req, res) => {
  try {
    const company_id = req.user.company_id;
    const { page, limit } = req.query;
    if (!company_id) {
      return res
        .status(400)
        .json({ result: false, message: "Company context is required..!" });
    }
    const userGetData = await getUser(company_id, page, limit);
    res.status(200).json(userGetData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};

export const updateUserController = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { telegram_username, email, role_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        result: false,
        message: "User_id is required..!",
      });
    }

    if (!telegram_username && !email && !role_id) {
      return res.status(400).json({
        result: false,
        message:
          "At least one field (telegram_username, email, or role_id) is required for update..!",
      });
    }
    const userUpdateData = await updateUser(
      telegram_username,
      email,
      role_id,
      user_id,
      req.user.company_id
    );
    res.status(200).json(userUpdateData);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ result: false, message: error.message });
  }
};
