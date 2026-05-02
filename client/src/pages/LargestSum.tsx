import React, { useEffect, useState } from 'react'

function LargestSum() {
    const [val1, setVal1] = useState<Number>(0);
    const [val2, setVal2] = useState<Number>(0);
    const [val3, setVal3] = useState<Number>(0);
const compare = ()=>{
   if(val1 > val2 && val1 > val3){
    alert('val1 is greatest')
   }
   else if(val2 > val1 && val2 > val3){
    alert('val2 is greatest')
   }
   else if(val3 > val1 && val3 > val2){
    alert('val3 is greatest')
   }  
}
     
useEffect(()=>{
    
    console.log('val1', val1, )
    console.log('val2', val2, )
    console.log('val3', val3, )

},[val1, val2, val3])
      
        
    

  return (
    <>
<input type='Number'  onChange={(e)=> setVal1(Number(e.target.value))} />
<input type='Number'  onChange={(e)=> setVal2(Number(e.target.value))} />
<input type='Number'  onChange={(e)=> setVal3(Number(e.target.value))} />
    <button onClick={()=>compare()}>compare</button>
    </>
  )


}

export default LargestSum
