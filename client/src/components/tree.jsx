const FileTreeNode = ({ fileName, nodes,onSelect,path}) => {
  const  isDir = !!nodes
  return (
    <div onClick={(e)=>{
       e.stopPropagation()
       if(!isDir){
        return;
       }
       onSelect(path)
    }} style={{marginLeft: "10px"}}>
      <p className={isDir ? "":"file-node"}>{fileName}</p>
      {nodes && (
        <ul>
          {Object.keys(nodes).map((child) => (
            <li key={child}>
              <FileTreeNode fileName={child} path={path+"/"+child } nodes={nodes[child]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const FileTree = ({ tree }) => {
  console.log(tree);
  return <FileTreeNode fileName="/" path=""  nodes={tree} />;
};
export default FileTree;
