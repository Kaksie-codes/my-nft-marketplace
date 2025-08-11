// interface NewNFTCardProps {
//     image: string;
//     title: string;
//     count: number;
//     creator?: {
//         name: string;
//         age: number;
//     };
// }

// const NewNFTCard: React.FC<NewNFTCardProps> = ({
//     image, 
//     title, 
//     count, 
//     creator
// } 
// // : 
// // {
// //     image: string, 
// //     title: string, 
// //     count: number, 
// //     creator?: {name: string, age: number}
// // }
// ) => {
//   return (
//     <div>
//         <img src={image} alt="" />
//       <h1 className="text-xl font-semibold text-main">{title}</h1>
//       <h1 className="text-primary">{count}</h1>
//       {creator?.name && <p className="text-main">author: {creator?.name}</p>}
//       {creator?.age ? <p className="text-main">age: {creator?.age}</p> : null}
//     </div>
//   )
// }

// export default NewNFTCard




const NewNFTCard = () => {
  return (
    <div>
      <h1>Age: 12</h1>
      <h1>Name: Anima Kid</h1>
    </div>
  )
}

export default NewNFTCard
