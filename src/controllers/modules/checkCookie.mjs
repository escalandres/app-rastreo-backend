
import jwt from 'jsonwebtoken';

export function checkCookie(token) {
    try {
        const decoded = jwt.verify(token, process.env.KEY);
        return {success: true, decoded: decoded}
    } catch (error) {
        return {success: false, decoded: ""}
    }
}