import { useAuth } from "../hooks/useAuth"

export default function Account(){
    /**
     * @returns Account Component
     * This is the account Icon and subsequent overlay
     * It should display the account.svg icon
     * When clicked, an overlay pops up showing the User's email
     * and the User's permission level. 
     * 
     * 
     */


    //const { user } = useAuth();

    return (
        <>
            <div>
                <img src="../assets/account.svg"/>
            </div>
        </>
    )
}