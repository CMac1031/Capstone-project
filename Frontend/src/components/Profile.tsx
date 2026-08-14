import {useAuth} from "../hooks/useAuth";

export default function Profile(){
    const { isAuthenticated, isAdmin, user } = useAuth();
    //isAuthenticated can see customer profiles
    //isAdmin can edit customer profiles
    return (
        <>
        
        </>
    );
}


